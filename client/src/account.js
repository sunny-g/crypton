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

var MIN_PBKDF2_ROUNDS = 2000;

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

  // sometimes the account object is used as a peer
  // to make the code simpler. verifyAndDecrypt checks
  // that the peer it is passed is trusted, or returns
  // an error. if we've gotten this far, we can be sure
  // that the public keys are trustable.
  this.trusted = true;

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
  if (!peer.trusted) {
    return {
      error: 'Peer is untrusted'
    }
  }

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

/**!
 * ### changePassword()
 * Convienence function to change the user's password
 *
 * @param {String} oldPassword
 * @param {String} newPassword
 * @param {Function} callback
 * @param {Function} keygenProgressCallback [optional]
 * @param {Number} numRounds [optional] (Integer > 4999)
 * @param {Boolean} skipCheck [optional]
 * @return void
 */
Account.prototype.changePassword =
  function (oldPassword, newPassword,
            callback, keygenProgressCallback, numRounds, skipCheck) {
  console.log('Change Password...');
  if (skipCheck) {
    if (oldPassword == newPassword) {
      var err = 'New password cannot be the same as current password';
      return callback(err);
    }
  }

  if (!numRounds) {
    numRounds = MIN_PBKDF2_ROUNDS;
  }
  if (typeof numRounds != 'number') {
    numRounds = MIN_PBKDF2_ROUNDS;
  } else if (numRounds < MIN_PBKDF2_ROUNDS) {
    numRounds = MIN_PBKDF2_ROUNDS;
  }
  // You can play with numRounds from 2000+,
  // but cannot set numRounds below 2000

  if (keygenProgressCallback) {
    if (typeof keygenProgressCallback == 'function') {
      keygenProgressCallback();
    }
  }

  var that = this;

  this.unravel(function (err) {
    if (err) {
      callback(err);
    }

    // Replace all salts with new ones
    var keypairSalt = crypton.randomBytes(32);
    var keypairMacSalt = crypton.randomBytes(32);
    var signKeyPrivateMacSalt = crypton.randomBytes(32);

    var keypairKey =
      sjcl.misc.pbkdf2(newPassword, keypairSalt, numRounds);

    var keypairMacKey =
      sjcl.misc.pbkdf2(newPassword, keypairMacSalt, numRounds);

    var signKeyPrivateMacKey =
      sjcl.misc.pbkdf2(newPassword, signKeyPrivateMacSalt, numRounds);

    // Re-encrypt the stored keyring

    var tmpAcct = {};
    console.log('\n\nthis.signingKeys\n\n');
    console.log(that.signingKeys);

    console.log(Object.keys(that));

    tmpAcct.signKeyPrivateCiphertext =
      sjcl.encrypt(keypairKey,
                   JSON.stringify(that.signingKeys.sec.serialize()),
                   crypton.cipherOptions);

    tmpAcct.signKeyPrivateMac = crypton.hmac(signKeyPrivateMacKey,
                                             that.signKeyPrivateCiphertext);

    // save existing account data into new JSON string
    var originalAcct = that.serialize();

    // Set the new properties of the account before we save
    tmpAcct.keypairKey = keypairKey;
    tmpAcct.keypairSalt = keypairSalt;
    tmpAcct.keypairMacKey = keypairMacKey;
    tmpAcct.keypairMacSalt = keypairMacSalt;
    tmpAcct.signKeyPrivateMacKey = signKeyPrivateMacKey;
    tmpAcct.signKeyPrivateMacSalt = signKeyPrivateMacSalt;

    tmpAcct.keypairCiphertext =
      sjcl.encrypt(keypairKey,
                   JSON.stringify(that.keypair.sec.serialize()),
                   crypton.cipherOptions);
    tmpAcct.keypairCiphertext['pbkdf2NumRounds'] = numRounds;
    // XXXddahl
    // NOTE:
    // The original numRounds chosen by the developer is tacked onto this
    // object for the time being. A bit of a hack, but makes
    // the implementation simpler until we refactor key structures
    // while adding the Web Crypto API crypto module, see issue #251
    // https://github.com/SpiderOak/crypton/issues/251

    tmpAcct.keypairMac =
      crypton.hmac(keypairMacKey, tmpAcct.keypairCiphertext);

    for (var prop in tmpAcct) {
      that[prop] = tmpAcct[prop];
    }

    console.log('SAVING..............');

    that.save(function (err) {
      if (err) {
        console.log(err);
        // The acount save failed, but we still have the original data yet
        // Revert back to what we had before the process started...
        var origAcctObj = JSON.parse(originalAcct);
        for (var prop in tmpAcct) {
          that[prop] = origAcctObj[prop];
        }
        callback(err, that);
      }
      callback(null, that);
    });
  });
};
})();
