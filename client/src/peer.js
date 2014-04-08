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

(function () {

'use strict';

/**!
 * # Peer(options)
 *
 * ````
 * var options = {
 *   username: 'friend' // required
 * };
 *
 * var peer = new crypton.Peer(options);
 * ````
 *
 * @param {Object} options
 */
var Peer = crypton.Peer = function (options) {
  options = options || {};

  this.accountId = options.id;
  this.session = options.session;
  this.username = options.username;
  this.pubKey = options.pubKey;
  this.signKeyPub = options.signKeyPub;
};

/**!
 * ### fetch(callback)
 * Retrieve peer data from server, applying it to parent object
 *
 * Calls back with peer data and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Function} callback
 */
Peer.prototype.fetch = function (callback) {
  if (!this.username) {
    callback('Must supply peer username');
    return;
  }

  if (!this.session) {
    callback('Must supply session to peer object');
    return;
  }

  var that = this;
  var url = crypton.url() + '/peer/' + this.username;
  superagent.get(url)
    .withCredentials()
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

    var peer = res.body.peer;
    that.accountId = peer.accountId;
    that.username = peer.username;
    that.pubKey = peer.pubKey;
    that.signKeyPub = peer.signKeyPub;
    // this may be necessary
    var point = sjcl.ecc.curves['c' + peer.pubKey.curve].fromBits(peer.pubKey.point);
    that.pubKey = new sjcl.ecc.elGamal.publicKey(peer.pubKey.curve, point.curve, point);
    var signPoint =
      sjcl.ecc.curves['c' + peer.signKeyPub.curve].fromBits(peer.signKeyPub.point);
    that.signKeyPub = new sjcl.ecc.ecdsa.publicKey(peer.signKeyPub.curve, signPoint.curve, signPoint);

    // calculate fingerprint for public key
    that.fingerprint = crypton.fingerprint(that.pubKey, that.signKeyPub);

    callback(null, that);
  });
};

/**!
 * ### encrypt(payload)
 * Encrypt `message` with peer's public key
 *
 * @param {Object} payload
 * @return {Object} ciphertext
 */
Peer.prototype.encrypt = function (payload) {
  // should this be async to callback with an error if there is no pubkey?
  var ciphertext = sjcl.encrypt(this.pubKey, JSON.stringify(payload), crypton.cipherOptions);
  return ciphertext;
};

/**!
 * ### encryptAndSign(payload)
 * Encrypt `message` with peer's public key, sign the message with own signing key
 *
 * @param {Object} payload
 * @return {Object}
 */
Peer.prototype.encryptAndSign = function (payload) {
  try {
    var ciphertext = sjcl.encrypt(this.pubKey, JSON.stringify(payload), crypton.cipherOptions);
    // hash the ciphertext and sign the hash:
    var hash = sjcl.hash.sha256.hash(ciphertext);
    var signature = this.session.account.signKeyPrivate.sign(hash, crypton.paranoia);
    return { ciphertext: JSON.parse(ciphertext), signature: signature, error: null };
  } catch (ex) {
    var err = "Error: Could not complete encryptAndSign: " + ex;
    return { ciphertext: null, signature: null, error: err };
  }
};

/**!
 * ### sendMessage(headers, payload, callback)
 * Encrypt `headers` and `payload` and send them to peer in one logical `message`
 *
 * Calls back with message id and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} headers
 * @param {Object} payload
 */
Peer.prototype.sendMessage = function (headers, payload, callback) {
  if (!this.session) {
    callback('Must supply session to peer object');
    return;
  }

  var message = new crypton.Message(this.session);
  message.headers = headers;
  message.payload = payload;
  message.fromAccount = this.session.accountId;
  message.toAccount = this.accountId;
  message.encrypt(this);
  message.send(callback);
};

/**!
 * ### trust(callback)
 * Add peer's fingerprint to internal trust state container
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Function} callback
 */
Peer.prototype.trust = function (callback) {
  var that = this;

  that.session.load('_trust_state', function (err, container) {
    if (err) {
      return callback(err);
    }

    if (container.keys[that.username]) {
      return callback('Peer is already trusted');
    }

    container.keys[that.username] = {
      trustedAt: +new Date(),
      fingerprint: that.fingerprint
    };

    container.save(function (err) {
      if (err) {
        return callback(err);
      }

      that.trusted = true;
      callback(null);
    });
  });
};

})();
