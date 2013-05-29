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
  crypton.version = '0.0.1';
  crypton.host = 'localhost';
  crypton.port = '443';
  crypton.cipherOptions = {
    mode: 'gcm'
  };

  crypton.url = function () {
    return 'https://' + crypton.host + ':' + crypton.port;
  };

  function randomBytes (nbytes) {
    return sjcl.random.randomWords(nbytes);
  }
  crypton.randomBytes = randomBytes;

  crypton.generateAccount = function (username, passphrase, callback, options) {
    options = options || {};
    var keypairCurve = options.keypairCurve || 384;
    var save = typeof options.save !== 'undefined' ? options.save : true;

    var account = new crypton.Account();
    var containerNameHmacKey = randomBytes(8);
    var hmacKey = randomBytes(8);
    var keypairSalt = randomBytes(8);
    var keypair = sjcl.ecc.elGamal.generateKeys(keypairCurve, 0);
    var symkey = keypair.pub.kem(0);
    var challengeKeySalt = randomBytes(8);
    var keypairKey = sjcl.misc.pbkdf2(passphrase, keypairSalt);

    account.username = username;
    account.challengeKeySalt = JSON.stringify(challengeKeySalt);
    account.challengeKey = JSON.stringify(sjcl.misc.pbkdf2(passphrase, challengeKeySalt));
    account.keypairSalt = JSON.stringify(keypairSalt);
    account.keypairCiphertext = sjcl.encrypt(keypairKey, JSON.stringify(keypair.sec.serialize()), crypton.cipherOptions);
    account.containerNameHmacKeyCiphertext = sjcl.encrypt(symkey.key, JSON.stringify(containerNameHmacKey), crypton.cipherOptions);
    account.hmacKeyCiphertext = sjcl.encrypt(symkey.key, JSON.stringify(hmacKey), crypton.cipherOptions);
    account.pubKey = JSON.stringify(keypair.pub.serialize());
    account.symKeyCiphertext = JSON.stringify(symkey.tag);

    if (save) {
      account.save(function (err) {
        callback(err, account);
      });
      return;
    }

    callback(null, account);
  };

  crypton.authorize = function (username, passphrase, callback) {
    superagent.post(crypton.url() + '/account/' + username)
      .end(function (res) {
        if (!res.body || res.body.success !== true) {
          callback(res.body.error);
          return;
        }

        var body = res.body;
        var response = {};
        response.challengeKey = sjcl.misc.pbkdf2(passphrase, body.challengeKeySalt);

        superagent.post(crypton.url() + '/account/' + username + '/answer')
          .send(response)
          .end(function (res) {
            if (!res.body || res.body.success !== true) {
              callback(res.body.error);
              return;
            }

            var sessionIdentifier = res.body.sessionIdentifier;
            var session = new crypton.Session(sessionIdentifier);
            session.account = new crypton.Account();
            session.account.passphrase = passphrase;
            for (var i in res.body.account) {
              session.account[i] = res.body.account[i];
            }

            session.account.unravel(function () {
              callback(null, session);
            });
          });
      }
    );
  };

  crypton.resurrect = function () {

  };
})();

