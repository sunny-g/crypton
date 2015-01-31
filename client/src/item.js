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

var ERRS = crypton.errors;

var Item = crypton.Item = function Item (name, value, session, creator, callback) {
  // XXXddahl: do argument validation
  if (!callback || typeof callback != 'function') {
    console.error(ERRS.ARG_MISSING_CALLBACK);
    throw new Error(ERRS.ARG_MISSING_CALLBACK);
  }
  if (!name || !session || !creator) {
    console.error(ERRS.ARG_MISSING);
    callback(ERRS.ARG_MISSING);
  }

  this.name = name;
  this.session = session;
  this.creator = creator; // The peer who owns this Item
  this._value = value || null;
  this.listeners = [];
  this.sessionKey = null;

  this.sync(callback || function (err) {
    if (err) {
      // throws if there is an error
      // and no callback supplied
      console.log(err);
      throw new Error(err);
    }
  });

  var that = this;
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
    console.log(ERRS.PROPERTY_MISSING);
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
  console.log('syncWithHmac()');
  var that = this;
  var url = crypton.url() + '/item/' + itemNameHmac;

  superagent.get(url)
    .withCredentials()
    .end(function (res) {
      console.log('syncWithHmac result: ', res);

      var doesNotExist = 'Item does not exist';

      if ((!res.body || res.body.success !== true) && res.body.error != doesNotExist) {
        return callback(res.body.error);
      }

      if (res.body.error == doesNotExist) {
        console.log('does not exist, creating....');
        return that.create(callback);
      }

      // XXXddahl: alert listeners?
      debugger;
      that.parseAndOverwrite(res.body.rawData, callback);
    });
};

Item.prototype.parseAndOverwrite = function (rawData, callback) {
  console.log('parseAndOverwrite', rawData);
  // We were just handed the latest version stored on the server. overwrite locally
  var cipherItem = rawData.ciphertext;

  // XXXddahl: create 'unwrapPayload()'

  var hash = sjcl.hash.sha256.hash(cipherItem.ciphertext);
  var verified = false;
  try {
    verified = this.creator.signKeyPub.verify(hash, cipherItem.signature);
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    return callback('Cannot verify Item ' + this.getPublicName());
  }

  var decrypted = sjcl.decrypt(this.secretKey, cipherItem.ciphertext, crypton.cipherOptions);

  if (decrypted.error) {
    console.error(decrypted.error);
    return callback('Cannot get and decrypt item ' + this.name);
  }

  this.value = JSON.parse(decrypted.plaintext);
  callback(null, this);
};

Item.prototype.save = function (callback) {
  console.log('saving', this._value);
  // XXXddahl: verify args!!
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
    .send(payload)
    .end(function (res) {
      // XXXdddahl: error checking
      console.log('success: ', res.body.success);
      if (!res.body.success) {
        return callback('Cannot save item');
      }
      // set modified_time to latest
      return callback(null, that);
    });
};

Item.prototype.share = function () {
  throw new Error('Unimplemented');
};

Item.prototype.unshare = function () {
  throw new Error('Unimplemented');
};

Item.prototype.watch = function (listener) {
  throw new Error('Unimplemented');
  // this.listeners.push(listener);
};

Item.prototype.unwatch = function () {
  throw new Error('Unimplemented');
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
  console.log('create()');
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
  superagent.post(url).withCredentials().send(payload).end(function (res) {
    // XXXddahl: better error checking & reporting needed
    console.log(res);
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

})();
