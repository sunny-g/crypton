/* Crypton Client, Copyright 2013 SpiderOak, Inc.
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

var Item = crypton.Item = function Item (name, session, callback) {
  this.raw = null;
  this.name = name;
  this.session = session;

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
      return that.raw;
    },
    set: function (value) {
      that.raw = value;
      that.save();
    }
  });
};

Item.prototype.getPublicName = function () {
  if (this.nameHmac) {
    return this.nameHmac;
  }

  // differentiate from containers
  // with identical names
  var name = 'item:' + this.name;

  var hmac = new sjcl.misc.hmac(this.session.account.containerNameHmacKey);
  var containerNameHmac = hmac.encrypt(name);
  this.nameHmac = sjcl.codec.hex.fromBits(containerNameHmac);
  return this.nameHmac;
};

Item.prototype.sync = function (callback) {
  var itemNameHmac = this.getPublicName();
  this.syncWithHmac(itemNameHmac, callback);
};

Item.prototype.syncWithHmac = function (itemNameHmac, callback) {
  var that = this;
  var url = crypton.url() + '/item/' + itemNameHmac;

  superagent.get(url)
    .withCredentials()
    .end(function (res) {
      var doesNotExist = 'Item does not exist';

      if ((!res.body || res.body.success !== true) && res.body.error != doesNotExist) {
        return callback(res.body.error);
      }

      if (res.body.error == doesNotExist) {
        return that.create(callback);
      }

      // alert listeners?
      that.parseAndOverwrite(res.body.value, callback);
    });
};

Item.prototype.parseAndOverwrite = function (value, callback) {
  console.log('parseAndOverwrite', value);
};

Item.prototype.save = function () {
  console.log('saving', this.raw);
  var that = this;
  this.raw = JSON.stringify(this.value);
  var rawPayloadCiphertext = sjcl.encrypt(that.sessionKey, this.raw, crypton.cipherOptions);
  var payloadCiphertextHash = sjcl.hash.sha256.hash(JSON.stringify(rawPayloadCiphertext));
  var payloadSignature = that.session.account.signKeyPrivate.sign(payloadCiphertextHash, crypton.paranoia);
  var payload = {
    ciphertext: rawPayloadCiphertext,
    signature: payloadSignature
  };

  var url = crypton.url() + '/item/' + this.getPublicName();
  superagent.post(url)
    .withCredentials()
    .send(payload)
    .end(function (res) {

    });
};

Item.prototype.share = function () {

};

Item.prototype.unshare = function () {
  throw new Error('Unimplemented');
};

Item.prototype.watch = function (listener) {
  this.listeners.push(listener);
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
  var selfPeer = new crypton.Peer({
    session: this,
    pubKey: this.account.pubKey,
    signKeyPub: this.account.signKeyPub
  });
  selfPeer.trusted = true;

  var sessionKey = crypton.randomBytes(32);
  var sessionKeyCiphertext = selfPeer.encryptAndSign(sessionKey);

  if (sessionKeyCiphertext.error) {
    return callback(sessionKeyCiphertext.error);
  }

  delete sessionKeyCiphertext.error;

  var itemNameHmac = this.getPublicName();

  var rawPayloadCiphertext = sjcl.encrypt(sessionKey, JSON.stringify(null), crypton.cipherOptions);
  var payloadCiphertextHash = sjcl.hash.sha256.hash(JSON.stringify(rawPayloadCiphertext));
  var payloadSignature = this.account.signKeyPrivate.sign(payloadCiphertextHash, crypton.paranoia);
  var payloadCiphertext = {
    ciphertext: rawPayloadCiphertext,
    signature: payloadSignature
  };

  var that = this;
  new crypton.Transaction(this, function (err, tx) {
    var chunks = [
      {
        type: 'addContainerSessionKey',
        containerNameHmac: itemNameHmac,
        signature: signature
      }, {
        type: 'addContainerSessionKeyShare',
        toAccount: that.account.username,
        containerNameHmac: itemNameHmac,
        sessionKeyCiphertext: sessionKeyCiphertext,
      }, {
        type: 'addContainerRecord',
        containerNameHmac: itemNameHmac,
        payloadCiphertext: payloadCiphertext
      }
    ];

    async.eachSeries(chunks, function (chunk, callback2) {
      tx.save(chunk, callback2);
    }, function (err) {
      if (err) {
        return tx.abort(function () {
          callback(err);
        });
      }

      tx.commit(function (err) {
        if (err) {
          return callback(err);
        }

        // post create item
  var payload = {
    itemNameHmac: itemNameHmac,
    
  };
  var url = crypton.url() + '/item/create';
  superagent.post(url)
    .withCredentials()
    .send(payload)
    .end(function (res) {

    });
        callback(null);
      });
    });
  });
};

})();
