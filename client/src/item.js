/* Crypton Client, Copyright 2015 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Crypton Client is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Client is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Client.  If not, see <http://www.gnu.org/licenses/>.
*/

(function() {

'use strict';

var ERRS;

var Item = crypton.Item = function Item (name, value, session, creator, callback, nameHmac) {
  // name might be null but nameHmac not null if this is an item being loaded by a sharee
  ERRS = crypton.errors;

  if (!callback || typeof callback != 'function') {
    console.error(ERRS.ARG_MISSING_CALLBACK);
    throw new Error(ERRS.ARG_MISSING_CALLBACK);
  }
  if (!session || !creator) {
    console.error(ERRS.ARG_MISSING);
    return callback(ERRS.ARG_MISSING);
  }

  if (!name && !nameHmac) {
    console.error(ERRS.ARG_MISSING);
    return callback(ERRS.ARG_MISSING);
  }

  if (!name && nameHmac) {
    this.nameHmac = nameHmac;
    this.name = nameHmac; // XXXddahl: TODO carry the plain text name in the otem ciphertext?
  } else {
    this.name = name;
  }
  if (nameHmac) {
    this.sharedItem = true;
  } else {
    this.sharedItem = false;
  }

  // XXXddahl: TODO: cache 'shared' data in another item
  this.shared = {}; // who and when this was shared with
  this.session = session;
  this.creator = creator; // The peer who owns this Item
  this._value = value || null;
  this.listeners = [];
  this.sessionKey = null;

  var that = this;

  this.sync(function (err, item) {
    if (err) {
      console.error(err);
      return callback(err, null);
    }
    return callback(null, item);
  });

  Object.defineProperty(this, 'value', {
    get: function () {
      return that._value;
    },
    set: function (value) {
      that._value = value;
      that.save(function (err, item) {
        if (err) {
          console.error(err);
          return;
        }
        // XXXddahl: what to return here?
      });
    }
  });
};

Item.prototype.getPublicName = function () {
  // Must always return nameHmac
  if (!this.name) {
    throw new Error(ERRS.PROPERTY_MISSING);
  }
  if (this.nameHmac) {
    return this.nameHmac;
  }
  var hmac = new sjcl.misc.hmac(this.session.account.containerNameHmacKey);
  var itemNameHmac = hmac.encrypt(this.name);
  this.nameHmac = sjcl.codec.hex.fromBits(itemNameHmac);
  return this.nameHmac;
};

Item.prototype.sync = function (callback) {
  var itemNameHmac = this.getPublicName();
  this.syncWithHmac(itemNameHmac, callback);
};

Item.prototype.syncWithHmac = function (itemNameHmac, callback) {
  var that = this;
  var url = crypton.url() + '/item/' + itemNameHmac;

  if (this.sharedItem) {
    url = url + '?shared=1';
  }

  console.log('that.sharedItem', that.sharedItem);

  superagent.get(url)
    .withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .end(function (res) {
      var doesNotExist = 'Item does not exist';
      if ((!res.body || res.body.success !== true) && res.body.error != doesNotExist) {
        return callback(res.body.error);
      }
      if (res.body.error == doesNotExist) {
        if (that.sharedItem) {
          return callback('Item is no longer shared!', null);
        }
        return that.create(callback);
      }
      // XXXddahl: alert listeners?
      that.parseAndOverwrite(res.body.rawData, callback);
    });
};

Item.prototype.parseAndOverwrite = function (rawData, callback) {
  var cipherItem = rawData.ciphertext;
  var wrappedSessionKey = JSON.parse(rawData.wrappedSessionKey);

  // XXXddahl: create 'unwrapPayload()'
  var ct = JSON.stringify(cipherItem.ciphertext);
  var hash = sjcl.hash.sha256.hash(ct);
  var verified = false;
  try {
    verified = this.creator.signKeyPub.verify(hash, cipherItem.signature);
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    return callback('Cannot verify Item ' + this.getPublicName());
  }

  // Check for this.sessionKey, or unwrap it
  var sessionKeyResult;
  var peer;
  if (!this.sessionKey) {
    if (this.sharedItem) {
      peer = this.creator;
    } else {
      peer = this.session.createSelfPeer();
    }
    sessionKeyResult =
      this.session.account.verifyAndDecrypt(wrappedSessionKey, peer);
    if (sessionKeyResult.error) {
      return callback(ERRS.UNWRAP_KEY_ERROR);
    }
    this.sessionKey = JSON.parse(sessionKeyResult.plaintext);
  }

  var decrypted;
  try {
    decrypted = sjcl.decrypt(this.sessionKey, ct, crypton.cipherOptions);
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    return callback(ERRS.DECRYPT_CIPHERTEXT_ERROR);
  }
  var value;
  if (decrypted) {
    try {
      this._value = JSON.parse(decrypted);
    } catch (ex) {
      console.error(ex);
      console.error(ex.stack);
      // XXXddahl: check to see if this is an actual JSON error (malformed string, etc)
      this._value = decrypted; // Just a string, not an object
    }

    // XXXddahl: check to see if the modified_time is newer than the cached version (if any)

    var name;
    if (this.name) {
      name = this.name;
    } else {
      name = this.getPublicName();
    }
    this.session.items[name] = this;
    this.modTime = new Date(rawData.modTime);
    callback(null, this);
  }
};

Item.prototype.save = function (callback) {
  if (!callback || typeof callback != 'function') {
    console.error(ERRS.ARG_MISSING_CALLBACK);
    return callback(ERRS.ARG_MISSING_CALLBACK);
  }

  if (this.creator.username != this.session.account.username) {
    // Only creator of this Item can update it
    console.error(crypton.errors.UPDATE_PERMISSION_ERROR);
    return callback(crypton.errors.UPDATE_PERMISSION_ERROR);
  }

  var payload;
  try {
    payload = this.wrapItem();
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    return callback('Cannot wrap/save item');
  }

  var that = this;
  var url = crypton.url() + '/item/' + this.getPublicName();

  superagent.post(url)
    .withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .send(payload)
    .end(function (res) {
      if (!res.body.success) {
        return callback('Cannot save item');
      }
      that.modTime = new Date(res.body.result.modTime);
      return callback(null, res.body.result);
    });
};

// Wrap save to allow manually updating the item, using a custom callback
Item.prototype.update = function item_update (newValue, callback) {
  if (!callback || typeof callback != 'function') {
    console.error(ERRS.ARG_MISSING_CALLBACK);
    throw new Error(ERRS.ARG_MISSING_CALLBACK);
  }
  if (!newValue) {
    return callback(ERRS.ARG_MISSING);
  }
  this._value = newValue;
  this.save(callback);
};

/**!
 * ### create(itemName, callback)
 * Create item and save it to server
 *
 * Calls back with item and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Function} callback
 */
Item.prototype.create = function (callback) {
  if (!callback) {
    throw new Error('Callback function required');
  } else {
    if (typeof callback != 'function') {
      throw new Error('Callback argument type must be function');
    }
  }

  var sessionKey = crypton.randomBytes(32);
  this.sessionKey = sessionKey;

  var payload;

  try {
    payload = this.wrapItem();
  } catch (ex) {
    console.error(ex);
    return callback('Error: Cannot wrapItem');
  }

  var that = this;
  // post create item
  var url = crypton.url() + '/createitem';
  superagent.post(url).withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .send(payload).end(function (res) {
    if (!res.body.success) {
      return callback('Cannot create item');
    }
    that.modTime = new Date(res.body.itemMetaData.modTime);
    that.session.items[that.name] = that;

    callback(null, that);
  });
};

Item.prototype.wrapItem = function item_wrapItem () {
  var selfPeer = this.session.createSelfPeer();
  var sessionKeyCiphertext = selfPeer.encryptAndSign(this.sessionKey);

  if (sessionKeyCiphertext.error) {
    throw new Error(sessionKeyCiphertext.error);
  }
  delete sessionKeyCiphertext.error;

  var itemNameHmac = this.getPublicName();
  var itemValue;

  if (this._value) {
    if (typeof this._value == 'string') {
      itemValue = this._value;
    } else {
      itemValue = JSON.stringify(this._value);
    }
  } else {
    itemValue = '{}';
    this._value = {};
  }

  var rawPayloadCiphertext =
    sjcl.encrypt(this.sessionKey, itemValue, crypton.cipherOptions);
  var payloadCiphertextHash = sjcl.hash.sha256.hash(rawPayloadCiphertext);
  var payloadSignature =
    this.session.account.signKeyPrivate.sign(payloadCiphertextHash, crypton.paranoia);
  var payloadCiphertext = {
    ciphertext: JSON.parse(rawPayloadCiphertext), // Fucking SJCL. WTF?
    signature: payloadSignature
  };

  // TODO is signing the sessionKey even necessary if we're
  // signing the sessionKeyShare? what could the container
  // creator attack by wrapping a different sessionKey?
  var sessionKeyHash = sjcl.hash.sha256.hash(sessionKeyCiphertext);
  var sessionKeySignature =
    this.session.account.signKeyPrivate.sign(sessionKeyHash, crypton.paranoia);

  var payload = {
    itemNameHmac: itemNameHmac,
    payloadCiphertext: JSON.stringify(payloadCiphertext),
    wrappedSessionKey: JSON.stringify(sessionKeyCiphertext)
  };

  return payload;
};

Item.prototype.remove = function (callback) {
  if (!callback) {
    throw new Error('Callback function required');
  } else {
    if (typeof callback != 'function') {
      throw new Error('Callback argument type must be function');
    }
  }
  // Verify client side ownership (DB check on server will also happen)
  if (this.creator.username != this.session.account.username) {
    // Only creator of this Item can update it
    console.error(crypton.errors.UPDATE_PERMISSION_ERROR);
    return callback(crypton.errors.UPDATE_PERMISSION_ERROR);
  }

  var that = this;
  // post remove item
  var url = crypton.url() + '/removeitem';

  var payload = {
    itemNameHmac: this.getPublicName()
  };

  superagent.post(url)
    .withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .send(payload)
    .end(function (res) {
    if (!res.body.success) {
      return callback('Cannot remove item');
    }
    that.deleted = new Date();
    callback(null);
  });
};

/**!
 * ### share(peer, callback)
 * Share an item with peer
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} peer
 * @param {Function} callback
 */
Item.prototype.share = function (peer, callback) {
  // XXXddahl: check if item is already shared
  if (!peer) {
    console.error(ERRS.ARG_MISSING);
    return callback(ERRS.ARG_MISSING);
  }

  var sessionKeyCiphertext = peer.encryptAndSign(this.sessionKey);
  var toUsername = peer.username;
  var itemNameHmac = this.getPublicName();

  var url = crypton.url() + '/shareitem/' + itemNameHmac;

  var payload = {
    toUsername: toUsername,
    sessionKeyCiphertext: sessionKeyCiphertext
  };
  var that = this;

  superagent.post(url)
    .withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .send(payload)
    .end(function (res) {
    if (!res.body.success) {
      return callback('Cannot share item');
    }
    // Send notification Message to user
    that.notifyItemShared(peer, function (err) {
      callback(null, res.body.success);
      that.shared[peer.username] = Date.now();
    });
  });
};

/**!
 * ### notifyItemShared(peer, callback)
 * notify peer of newly-shared item
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} peer
 * @param {Function} callback
 */
Item.prototype.notifyItemShared = function (peer, callback) {
  var headers = { notification: 'sharedItem' };
  var nameHmac = this.getPublicName();
  var payload = {
    itemNameHmac: nameHmac,
    from: this.creator.username,
    sent: Date.now()
  };

  peer.sendMessage(headers, payload, function (err) {
    if (err) {
      console.error(err);
      return callback(ERRS.PEER_MESSAGE_SEND_FAILED);
    }
    callback(null);
  });
};

/**!
 * ### unshare(peer, callback)
 * unshare an item with peer
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} peer
 * @param {Function} callback
 */
Item.prototype.unshare = function (peer, callback) {
  // POST hmac & username to complete unshare
  var that = this;
  var shareeUsername = peer.username;
  var itemNameHmac = this.getPublicName();

  var url = crypton.url() + '/unshareitem/' + itemNameHmac;

  var payload = {
    shareeUsername: shareeUsername
  };

  superagent.post(url)
    .withCredentials()
    .set('X-Session-ID', crypton.sessionId)
    .send(payload)
    .end(function (res) {
    if (!res.body.success) {
      console.error(res.body);
      return callback('Cannot unshare item');
    }
    // XXXddahl: TODO Send notification Message to user ???
    callback(null);
    try {
      delete that.shared[shareeUsername];
    } catch (ex) {
      console.warn('Sharee not listed in item.shared object');
    }
  });
};

/**!
 * ### lastUpdate(callback)
 * Find out when the utem was last updated by the creator
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Function} callback
 */
Item.prototype.lastUpdate = function (callback) {
  console.warn('Unimplemented!');
};

})();
