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

/**!
 * # Account()
 *
 * ````
 * var account = new crypton.Account();
 * ````
 */
var Account = crypton.Account = function Account () {};

/**!
 * ### save(callback)
 * Send the current account to the server to be saved
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Function} callback
 */
Account.prototype.save = function (callback) {
  superagent.post(crypton.url() + '/account')
    .withCredentials()
    .send(this.serialize())
    .end(function (res) {
      if (res.body.success !== true) {
        callback(res.body.error);
      } else {
        callback();
      }
    }
  );
};

/**!
 * ### unravel(callback)
 * Decrypt raw account object from server after successful authentication
 *
 * Calls back without error if successful
 *
 * __Throws__ if unsuccessful
 *
 * @param {Function} callback
 */
Account.prototype.unravel = function (callback) {
  var that = this;

  crypton.work.unravelAccount(this, function (err, data) {
    if (err) {
      return callback(err);
    }

    that.regenerateKeys(data, function (err) {
      callback(err);
    });
  });
};

/**!
 * ### regenerateKeys(callback)
 * Reconstruct keys from unraveled data
 *
 * Calls back without error if successful
 *
 * __Throws__ if unsuccessful
 *
 * @param {Function} callback
 */
Account.prototype.regenerateKeys = function (data, callback) {
  // reconstruct secret key
  var exponent = sjcl.bn.fromBits(data.secret.exponent);
  this.secretKey = new sjcl.ecc.elGamal.secretKey(data.secret.curve, sjcl.ecc.curves['c' + data.secret.curve], exponent);

  // reconstruct public key
  var point = sjcl.ecc.curves['c' + this.pubKey.curve].fromBits(this.pubKey.point);
  this.pubKey = new sjcl.ecc.elGamal.publicKey(this.pubKey.curve, point.curve, point);

  // assign the hmac keys to the account
  this.hmacKey = data.hmacKey;
  this.containerNameHmacKey = data.containerNameHmacKey;

  // reconstruct the public signing key
  var signPoint = sjcl.ecc.curves['c' + this.signKeyPub.curve].fromBits(this.signKeyPub.point);
  this.signKeyPub = new sjcl.ecc.ecdsa.publicKey(this.signKeyPub.curve, signPoint.curve, signPoint);

  // reconstruct the secret signing key
  var signExponent = sjcl.bn.fromBits(data.signKeySecret.exponent);
  this.signKeyPrivate = new sjcl.ecc.ecdsa.secretKey(data.signKeySecret.curve, sjcl.ecc.curves['c' + data.signKeySecret.curve], signExponent);

  // calculate fingerprint for public key
  this.fingerprint = crypton.fingerprint(this.pubKey, this.signKeyPub);

  // recalculate the public points from secret exponents
  // and verify that they match what the server sent us
  var pubKeyHex = sjcl.codec.hex.fromBits(this.pubKey._point.toBits());
  var pubKeyShouldBe = this.secretKey._curve.G.mult(exponent);
  var pubKeyShouldBeHex = sjcl.codec.hex.fromBits(pubKeyShouldBe.toBits());

  if (!crypton.constEqual(pubKeyHex, pubKeyShouldBeHex)) {
    return callback('Server provided incorrect public key');
  }

  var signKeyPubHex = sjcl.codec.hex.fromBits(this.signKeyPub._point.toBits());
  var signKeyPubShouldBe = this.signKeyPrivate._curve.G.mult(signExponent);
  var signKeyPubShouldBeHex = sjcl.codec.hex.fromBits(signKeyPubShouldBe.toBits());

  if (!crypton.constEqual(signKeyPubHex, signKeyPubShouldBeHex)) {
    return callback('Server provided incorrect public signing key');
  }

  callback(null);
};

/**!
 * ### serialize()
 * Package and return a JSON representation of the current account
 *
 * @return {Object}
 */
// TODO rename to toJSON
Account.prototype.serialize = function () {
  return {
    srpVerifier: this.srpVerifier,
    srpSalt: this.srpSalt,
    containerNameHmacKeyCiphertext: this.containerNameHmacKeyCiphertext,
    hmacKeyCiphertext: this.hmacKeyCiphertext,
    keypairCiphertext: this.keypairCiphertext,
    keypairMac: this.keypairMac,
    pubKey: this.pubKey,
    keypairSalt: this.keypairSalt,
    keypairMacSalt: this.keypairMacSalt,
    signKeyPrivateMacSalt: this.signKeyPrivateMacSalt,
    username: this.username,
    signKeyPub: this.signKeyPub,
    signKeyPrivateCiphertext: this.signKeyPrivateCiphertext,
    signKeyPrivateMac: this.signKeyPrivateMac
  };
};

/**!
 * ### verifyAndDecrypt()
 * Convienence function to verify and decrypt public key encrypted & signed data
 *
 * @return {Object}
 */
Account.prototype.verifyAndDecrypt = function (signedCiphertext, peer) {
  // hash the ciphertext
  var ciphertextString = JSON.stringify(signedCiphertext.ciphertext);
  var hash = sjcl.hash.sha256.hash(ciphertextString);
  // verify the signature
  var verified = false;
  try {
    verified = peer.signKeyPub.verify(hash, signedCiphertext.signature);
  } catch (ex) { }
  // try to decrypt regardless of verification failure
  try {
    var message = sjcl.decrypt(this.secretKey, ciphertextString, crypton.cipherOptions);
    if (verified) {
      return { plaintext: message, verified: verified, error: null };
    } else {
      return { plaintext: null, verified: false, error: 'Cannot verify ciphertext' };
    }
  } catch (ex) {
    return { plaintext: null, verified: false, error: 'Cannot verify ciphertext' };
  }
};
})();
