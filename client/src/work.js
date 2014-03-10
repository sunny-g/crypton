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
    try {
      ret.secret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(account.keypairCiphertext), crypton.cipherOptions));
    } catch (e) {}

    if (!ret.secret) {
      // TODO could be decryption or parse error - should we specify?
      return callback('Could not parse secret key');
    }

    var exponent = sjcl.bn.fromBits(ret.secret.exponent);
    var secretKey = new sjcl.ecc.elGamal.secretKey(ret.secret.curve, sjcl.ecc.curves['c' + ret.secret.curve], exponent);

    // decrypt symkey
    ret.symKey = secretKey.unkem(account.symKeyCiphertext);

    // decrypt hmac keys
    try {
      ret.containerNameHmacKey = JSON.parse(sjcl.decrypt(ret.symKey, JSON.stringify(account.containerNameHmacKeyCiphertext), crypton.cipherOptions));
    } catch (e) {}

    if (!ret.containerNameHmacKey) {
      // TODO could be decryption or parse error - should we specify?
      return callback('Could not parse containerNameHmacKey');
    }

    try {
      ret.hmacKey = JSON.parse(sjcl.decrypt(ret.symKey, JSON.stringify(account.hmacKeyCiphertext), crypton.cipherOptions));
    } catch (e) {}

    if (!ret.hmacKey) {
      // TODO could be decryption or parse error - should we specify?
      return callback('Could not parse hmacKey');
    }

    // decrypt signing key
    try {
      ret.signKeySecret = JSON.parse(sjcl.decrypt(keypairKey, JSON.stringify(account.signKeyPrivateCiphertext), crypton.cipherOptions));
    } catch (e) {}

    if (!ret.signKeySecret) {
      return callback('Could not parse signKeySecret');
    }

    callback(null, ret);
  } catch (e) {
    console.log(e);
    callback(e);
  }
};

work.decryptRecord = function (options, callback) {
  var sessionKey = options.sessionKey;
  var creationTime = options.creationTime;
  var expectedRecordIndex = options.expectedRecordIndex;
  var peerSignKeyPubSerialized = options.peerSignKeyPubSerialized;

  if (
    !sessionKey ||
    !creationTime ||
    !expectedRecordIndex ||
    !peerSignKeyPubSerialized
  ) {
    return callback('Must supply all options to work.decryptRecord');
  }

  var record;
  try {
    record = JSON.parse(options.record);
  } catch (e) {}

  if (!record) {
    return callback('Could not parse record');
  }

  // reconstruct the peer's public signing key
  // the key itself typically has circular references which
  // we can't pass around with JSON to/from a worker
  var curve = 'c' + peerSignKeyPubSerialized.curve;
  var signPoint = sjcl.ecc.curves[curve].fromBits(peerSignKeyPubSerialized.point);
  var peerSignKeyPub = new sjcl.ecc.ecdsa.publicKey(peerSignKeyPubSerialized.curve, signPoint.curve, signPoint);


  var verified = false;
  var payloadCiphertextHash = sjcl.hash.sha256.hash(JSON.stringify(record.ciphertext));

  try {
    verified = peerSignKeyPub.verify(payloadCiphertextHash, record.signature);
  } catch (e) {
    console.log(e);
  }

  if (!verified) {
    return callback('Record signature does not match expected signature');
  }

  var payload;
  try {
    payload = JSON.parse(sjcl.decrypt(sessionKey, record.ciphertext, crypton.cipherOptions));
  } catch (e) {}

  if (!payload) {
    return callback('Could not parse record payload');
  }

  if (payload.recordIndex !== expectedRecordIndex) {
    // TODO revisit
    // XXX ecto 3/4/14 I ran into a problem with this quite a while
    // ago where recordIndexes would never match even if they obviously
    // should. It smelled like an off-by-one or state error.
    // Now that record decryption is abstracted outside container instances,
    // we will have to do it in a different way anyway
    // (there was formerly a this.recordIndex++ here)

    // return callback('Record index mismatch');
  }

  callback(null, {
    time: +new Date(creationTime),
    delta: payload.delta
  });
};

})();
