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
  // regenerate keypair key from password
  var keypairKey = sjcl.misc.pbkdf2(this.passphrase, this.keypairSalt);

  // decrypt secret key
  var secret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(this.keypairCiphertext), crypton.cipherOptions));
  var exponent = sjcl.bn.fromBits(secret.exponent);
  this.secretKey = new sjcl.ecc.elGamal.secretKey(secret.curve, sjcl.ecc.curves['c' + secret.curve], exponent);

  // reconstruct public key and personal symkey
  var point = sjcl.ecc.curves['c' + this.pubKey.curve].fromBits(this.pubKey.point);
  this.pubKey = new sjcl.ecc.elGamal.publicKey(this.pubKey.curve, point.curve, point);

  var symKey = this.secretKey.unkem(this.symKeyCiphertext);
  this.symkey = symKey;

  // decrypt hmac keys
  this.containerNameHmacKey = sjcl.decrypt(symKey, JSON.stringify(this.containerNameHmacKeyCiphertext), crypton.cipherOptions);
  this.hmacKey = sjcl.decrypt(symKey, JSON.stringify(this.hmacKeyCiphertext), crypton.cipherOptions);

  var signKeyPubObj = this.signKeyPub;
  // Convert serialized Signing Keys to key objects:
  var signPoint =
    sjcl.ecc.curves['c' + signKeyPubObj.curve].fromBits(signKeyPubObj.point);
  this.signKeyPub =
      new sjcl.ecc.ecdsa.publicKey(signKeyPubObj.curve, signPoint.curve, signPoint);
  // Decrypt private key
  var signKeySecret =
    JSON.parse(sjcl.decrypt(keypairKey,
                            JSON.stringify(this.signKeyPrivateCiphertext),
                            crypton.cipherOptions));

  var signExponent = sjcl.bn.fromBits(signKeySecret.exponent);
  this.signKeyPrivate =
    new sjcl.ecc.ecdsa.secretKey(signKeySecret.curve,
                                 sjcl.ecc.curves['c' + signKeySecret.curve],
                                 signExponent);
  callback();
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
    pubKey: this.pubKey,
    keypairSalt: this.keypairSalt,
    symKeyCiphertext: this.symKeyCiphertext,
    username: this.username,
    signKeyPub: this.signKeyPub,
    signKeyPrivateCiphertext: this.signKeyPrivateCiphertext
  };
};

/**!
 * ### verifyAndDecrypt()
 * Convienence function to verify and decrypt public key encrypted & signed data
 *
 * @return {Object}
 */

Account.prototype.verifyAndDecrypt = function (signedCiphertext, peer) {
  // hash the message
  var hash = sjcl.hash.sha256.hash(JSON.stringify(signedCiphertext.ciphertext));
  // verify the signature
  var verified = peer.signKeyPub.verify(hash, signedCiphertext.signature );
  // try to decrypt regardless of verification failure
  try {
    var message = sjcl.decrypt(this.secretKey,
                               JSON.stringify(signedCiphertext.ciphertext),
                               crypton.cipherOptions);

    return { cleartext: message, verified: verified };
  } catch (ex) {
    return { error: "Cannot verify ciphertext" };
  }
};

})();
