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
  var Account = crypton.Account = function Account () {};

  Account.prototype.save = function (callback) {
    superagent.post(crypton.url() + '/account')
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

  Account.prototype.refresh = function () {
  };

  Account.prototype.unravel = function (callback) {
console.log(this);

    // reconstruct keypairKey from passphrase
    var keypairKey = sjcl.misc.pbkdf2(this.passphrase, this.keypairSalt);

    // decrypt keypair
    var secret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(this.keypairCiphertext)));
    var exponent = sjcl.bn.fromBits(secret.exponent);
    var secretKey = new sjcl.ecc.elGamal.secretKey(secret.curve, sjcl.ecc.curves['c' + secret.curve], exponent);

    var pub = JSON.parse(this.pubKey);
console.log(pub);
    var point = sjcl.ecc.curves['c' + pub.key.curve].fromBits(pub.key.point);
    var pubKey = new sjcl.ecc.elGamal.publicKey(pub.key.curve, point.curve, point);
    var symKey = secretKey.unkem(pub.tag);
console.log(symKey);

    // decrypt containerNameHmacKey
    this.containerNameHmacKey = sjcl.decrypt(symKey, JSON.stringify(this.containerNameHmacKeyCiphertext));
    console.log(this.containerNameHmacKey);

    // decrypt hmacKey
    var hmacKeyIv = hp(this.hmacKeyIv);
    encrypted = CryptoJS.lib.CipherParams.create({
      ciphertext: hp(this.hmacKeyCiphertext),
      iv: hmacKeyIv
    });
    this.hmacKey = CryptoJS.AES.decrypt(
      encrypted, this.symkey, {
        iv: hmacKeyIv,
        mode: CryptoJS.mode.CFB,
        padding: CryptoJS.pad.NoPadding
      }
    );

    callback();
  };

  Account.prototype.serialize = function () {
    return {
      challengeKey: this.challengeKey,
      containerNameHmacKeyCiphertext: this.containerNameHmacKeyCiphertext,
      containerNameHmacKeyIv: this.containerNameHmacKeyIv,
      hmacKey: this.hmacKey,
      hmacKeyCiphertext: this.hmacKeyCiphertext,
      hmacKeyIv: this.hmacKeyIv,
      keypairIv: this.keypairIv,
      keypairCiphertext: this.keypairCiphertext,
      pubKey: this.pubKey,
      challengeKeySalt: this.challengeKeySalt,
      keypairSalt: this.keypairSalt,
      symkeyCiphertext: this.symkeyCiphertext,
      username: this.username
    };
  };
})();

