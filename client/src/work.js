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

!self.worker && window.addEventListener('load', function () {
  var scriptEls = document.getElementsByTagName('script');
  var path;

  for (var i in scriptEls) {
    if (scriptEls[i].src && ~scriptEls[i].src.indexOf('crypton')) {
      path = scriptEls[i].src;
    }
  }

  isomerize(crypton.work, path)
}, false);

var work = crypton.work = {};

work.calculateSrpA = function (options, callback) {
  try {
    var srp = new SRPClient(options.username, options.passphrase, 2048, 'sha-256');
    var a = srp.srpRandom();
    var srpA = srp.calculateA(a);

    // Pad A out to 512 bytes
    // TODO: This length will change when a different SRP group is used
    var srpAstr = srpA.toString(16);
    srpAstr = srp.nZeros(512 - srpAstr.length) + srpAstr;

    callback(null, {
      a: a.toString(),
      srpA: srpA.toString(),
      srpAstr: srpAstr
    });
  } catch (e) {
    console.log(e);
    callback(e);
  }
};

work.calculateSrpM1 = function (options, callback) {
  try {
    var srp = new SRPClient(options.username, options.passphrase, 2048, 'sha-256');
    var srpSalt = options.srpSalt;
    var a = new BigInteger(options.a);
    var srpA = new BigInteger(options.srpA);
    var srpB = new BigInteger(options.srpB, 16);

    var srpu = srp.calculateU(srpA, srpB);
    var srpS = srp.calculateS(srpB, options.srpSalt, srpu, a);
    var srpM1 = srp.calculateMozillaM1(srpA, srpB, srpS).toString(16);
    // Pad srpM1 to the full SHA-256 length
    srpM1 = srp.nZeros(64 - srpM1.length) + srpM1;

    callback(null, srpM1);
  } catch (e) {
    console.log(e);
    callback(e);
  }
};

work.unravelAccount = function (account, callback) {
  try {
    var ret = {};

    // regenerate keypair key from password
    var keypairKey = sjcl.misc.pbkdf2(account.passphrase, account.keypairSalt);

    // decrypt secret key
    ret.secret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(account.keypairCiphertext), crypton.cipherOptions));
    var exponent = sjcl.bn.fromBits(ret.secret.exponent);
    var secretKey = new sjcl.ecc.elGamal.secretKey(ret.secret.curve, sjcl.ecc.curves['c' + ret.secret.curve], exponent);

    // decrypt symkey
    ret.symKey = secretKey.unkem(account.symKeyCiphertext);

    // decrypt hmac keys
    ret.containerNameHmacKey = JSON.parse(sjcl.decrypt(ret.symKey, JSON.stringify(account.containerNameHmacKeyCiphertext), crypton.cipherOptions));
    ret.hmacKey = JSON.parse(sjcl.decrypt(ret.symKey, JSON.stringify(account.hmacKeyCiphertext), crypton.cipherOptions));

    // decrypt signing key
    ret.signKeySecret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(account.signKeyPrivateCiphertext), crypton.cipherOptions));

    callback(null, ret);
  } catch (e) {
    console.log(e);
    callback(e);
  }
};

})();
