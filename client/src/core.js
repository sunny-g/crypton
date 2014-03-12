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

var crypton = {};

(function () {

'use strict';

/**!
 * ### version
 * Holds framework version for potential future backward compatibility
 */
crypton.version = '0.0.2';

/**!
 * ### host
 * Holds location of Crypton server
 */
crypton.host = location.hostname;

/**!
 * ### port
 * Holds port of Crypton server
 */
crypton.port = 443;

/**!
 * ### cipherOptions
 * Sets AES mode to GCM, necessary for SJCL
 */
crypton.cipherOptions = {
  mode: 'gcm'
};

/**!
 * ### paranoia
 * Tells SJCL how strict to be about PRNG readiness
 */
crypton.paranoia = 6;

/**!
 * ### url()
 * Generate URLs for server calls
 *
 * @return {String} url
 */
crypton.url = function () {
  return 'https://' + crypton.host + ':' + crypton.port;
};

/**!
 * ### randomBytes()
 * Generate `nbytes` bytes of random data
 *
 * @param {Number} nbytes (default 32)
 */
function randomBytes (nbytes) {
  var nwords = 8; // default 32 bytes, 256 bits

  // sjcl's words are 4 bytes (32 bits)
  if (nbytes) {
    nwords = nbytes / 4;
  }

  return sjcl.random.randomWords(nwords);
}
crypton.randomBytes = randomBytes;

/**!
 * ### randomBits()
 * Generate `nbits` bits of random data
 *
 * @param {Number} nbits (default 256)
 */
crypton.randomBits = function (nbits) {
  var nbytes = 32; // default 32 bytes, 256 bits

  // sjcl's words are 4 bytes (32 bits)
  if (nbits) {
    nbytes = nbits / 8;
  }

  return crypton.randomBytes(nbytes);
}

/**!
 * ### generateAccount(username, passphrase, callback, options)
 * Generate salts and keys necessary for an account
 *
 * Saves account to server unless `options.save` is falsey
 *
 * Calls back with account and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} username
 * @param {String} passphrase
 * @param {Function} callback
 * @param {Object} options
 */
// TODO consider moving non-callback arguments to single object
crypton.generateAccount = function (username, passphrase, callback, options) {
  options = options || {};

  if (!username || !passphrase) {
    return callback('Must supply username and passphrase');
  }

  var SIGN_KEY_BIT_LENGTH = 384;
  var keypairCurve = options.keypairCurve || 384;
  var save = typeof options.save !== 'undefined' ? options.save : true;

  var account = new crypton.Account();
  var containerNameHmacKey = randomBytes(32);
  var hmacKey = randomBytes(32);
  var keypairSalt = randomBytes(32);
  var keypair = sjcl.ecc.elGamal.generateKeys(keypairCurve, crypton.paranoia);
  var symkey = keypair.pub.kem(0);
  var keypairKey = sjcl.misc.pbkdf2(passphrase, keypairSalt);
  var signingKeys = sjcl.ecc.ecdsa.generateKeys(SIGN_KEY_BIT_LENGTH, crypton.paranoia);

  var srp = new SRPClient(username, passphrase, 2048, 'sha-256');
  var srpSalt = srp.randomHexSalt();
  var srpVerifier = srp.calculateV(srpSalt).toString(16);

  account.username = username;
  // Pad verifier to 512 bytes
  // TODO: This length will change when a different SRP group is used
  account.srpVerifier = srp.nZeros(512 - srpVerifier.length) + srpVerifier;
  account.srpSalt = srpSalt;
  account.keypairSalt = JSON.stringify(keypairSalt);
  account.keypairCiphertext = sjcl.encrypt(keypairKey, JSON.stringify(keypair.sec.serialize()), crypton.cipherOptions);
  account.containerNameHmacKeyCiphertext = sjcl.encrypt(symkey.key, JSON.stringify(containerNameHmacKey), crypton.cipherOptions);
  account.hmacKeyCiphertext = sjcl.encrypt(symkey.key, JSON.stringify(hmacKey), crypton.cipherOptions);
  account.pubKey = JSON.stringify(keypair.pub.serialize());
  account.symKeyCiphertext = JSON.stringify(symkey.tag);
  account.signKeyPub = JSON.stringify(signingKeys.pub.serialize());
  account.signKeyPrivateCiphertext = sjcl.encrypt(keypairKey, JSON.stringify(signingKeys.sec.serialize()), crypton.cipherOptions);

  if (save) {
    account.save(function (err) {
      callback(err, account);
    });
    return;
  }

  callback(null, account);
};

/**!
 * ### authorize(username, passphrase, callback)
 * Perform zero-knowledge authorization with given `username`
 * and `passphrase`, generating a session if successful
 *
 * Calls back with session and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * SRP variables are named as defined in RFC 5054
 * and RFC 2945, prefixed with 'srp'
 *
 * @param {String} username
 * @param {String} passphrase
 * @param {Function} callback
 */
crypton.authorize = function (username, passphrase, callback) {
  if (!username || !passphrase) {
    return callback('Must supply username and passphrase');
  }

  var options = {
    username: username,
    passphrase: passphrase
  };

  crypton.work.calculateSrpA(options, function (err, data) {
    if (err) {
      return callback(err);
    }

    var response = {
      srpA: data.srpAstr
    };

    superagent.post(crypton.url() + '/account/' + username)
      .withCredentials()
      .send(response)
      .end(function (res) {
        if (!res.body || res.body.success !== true) {
          return callback(res.body.error);
        }

        options.a = data.a;
        options.srpA = data.srpA;
        options.srpB = res.body.srpB;
        options.srpSalt = res.body.srpSalt;

        // calculateSrpM1
        crypton.work.calculateSrpM1(options, function (err, srpM1, ourSrpM2) {
          response = {
            srpM1: srpM1
          };

          superagent.post(crypton.url() + '/account/' + username + '/answer')
            .withCredentials()
            .send(response)
            .end(function (res) {
              if (!res.body || res.body.success !== true) {
                callback(res.body.error);
                return;
              }

              // TODO: Do compare in constant time
              if (res.body.srpM2 !== ourSrpM2) {
                callback('Server could not be verified');
                return;
              }

              var sessionIdentifier = res.body.sessionIdentifier;
              var session = new crypton.Session(sessionIdentifier);
              session.account = new crypton.Account();
              session.account.username = username;
              session.account.passphrase = passphrase;
              session.account.challengeKey = res.body.account.challengeKey;
              session.account.containerNameHmacKeyCiphertext = res.body.account.containerNameHmacKeyCiphertext;
              session.account.hmacKeyCiphertext = res.body.account.hmacKeyCiphertext;
              session.account.keypairCiphertext = res.body.account.keypairCiphertext;
              session.account.pubKey = res.body.account.pubKey;
              session.account.challengeKeySalt = res.body.account.challengeKeySalt;
              session.account.keypairSalt = res.body.account.keypairSalt;
              session.account.symKeyCiphertext = res.body.account.symKeyCiphertext;
              session.account.signKeyPub = res.body.account.signKeyPub;
              session.account.signKeyPrivateCiphertext = res.body.account.signKeyPrivateCiphertext;
              session.account.unravel(function () {
                callback(null, session);
              });
            });
        });
      });
  });
};

})();
