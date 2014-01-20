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

var assert = chai.assert;

describe('Account', function () {
  var account = new crypton.Account();
  account.passphrase = 'pass';
  account.keypairSalt = [1564845058,-1293627195,-1585435890,492648950,2141345437,1592867359,-937032772,-1905610525];
  account.keypairCiphertext = {"iv":"sUY4yMPHE9c41BVQf1mG4Q","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"ThYDjTqCdWWdc73mcqUNH/Z1B20TVIarjxuRm9uVQ7PLS3L2+AeRDKAtFIxa+ptJ0QHgx4+lXWVB8TNBNOZcVoxgLFTi0P+byOJimqOQVJUf40nYlwr7rGcbkkRCmQohr7FLt+NPeAz5YwZechGjZmBYEyUtWBG/rhIAsrCxEP+QpnUyg4iVtzq+RnSzNVJimH0/L8bzfcGe53ofwi7SjQu+qNG8yJ8XEAUR0ri4mUYm"};
  account.pubKey = {"point":[-2015264652,-1538140418,-1175319149,1657508811,-1743502158,-2083525240,188660825,992931953,-1782164223,40980219,1916901449,359203583,468335305,1081801300,1259748966,-889585411,-1770659608,-628811822,-363012455,232219854,-772619381,-86354165,109571400,785127553],"curve":384};
  account.symKeyCiphertext = [-1890852175,-1463681136,288196395,-1721887852,473345249,-1607953797,1580830373,428714056,-965153791,-1786103648,-1304058751,1147932365,-843226348,-518514188,-768167566,-1907360275,-1861046390,330482748,-411094456,-1055208610,60416359,-649285652,1075893283,-1792708249];
  account.containerNameHmacKeyCiphertext = {"iv":"+DGWzgQLX5JrDn3YnQin4g","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"Sz6fxXyupBBSxwVA5a4DE0c6iRJjQMJWM8aoAkvO5YdkiNAP9IdUZw2uj4qhtL6hBTvtOfbyRTizoHWxWW9A44WUr0kV+DcPyvFJrSy6gzALn5DsgflGF3yreQsGNGvI"};
  account.hmacKeyCiphertext = {"iv":"scJ0FirBeCraOTIp2v+WDg","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"N+OCBvmA9Go8zp7M5kxeaSNnd5CYey/F/Bzh7x5mHjUXbX4+0MDSWmsb8b3QbJ3rZcgb5xBfimeMNOkXwKJdZD4qS2fAeOF+EleIHG9J0OWKnXE2fZi00cTbqQrl5A1lTQ"};
  account.username = 'user';
  account.srpVerifier = 'verifier';
  account.srpSalt = 'salt';
  account.signKeyPub = {"point":[1744388526,-385387337,-560096753,-213682959,218774481,-816819128,1399389656,-465952384,-602448112,1252879409,814858193,-603139239],"curve":192};

account.signKeyPrivateCiphertext = {"iv":"dP8Pi+zbo9E3VZ2KneSu8g","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"8jbHw569SIdNMei+uwOF2FY4mOXJVV+CLtqALTTO4oBoH6tBEpTZDJKd1ebK2PmNCPZB2lfXAW8SQLLcGPPMmKef7rMs2qh6x2j0B36cf5mqfe/Ph5Emfx+KB9m7xd3S55BaFDW90gvdf44"};


  describe('save()', function () {
    // TODO should we just test this in the integration tests?
  });

  describe('unravel()', function () {
    it('should generate the correct fields from given values', function (done) {
      account.unravel(function () {
        var fields = [
          'srpVerifier',
          'srpSalt',
          'secretKey',
          'pubKey',
          'symkey',
          'containerNameHmacKey',
          'hmacKey',
          'signKeyPub',
          'signKeyPrivate'
        ];

        for (var i in fields) {
          assert(typeof account[fields[i]] !== undefined);
        }

        done();
      });
    });
  });

  describe('serialize()', function () {
    it('should return the correct fields', function (done) {
      var expected = [
        'srpVerifier',
        'srpSalt',
        'containerNameHmacKeyCiphertext',
        'hmacKeyCiphertext',
        'keypairCiphertext',
        'pubKey',
        'keypairSalt',
        'symKeyCiphertext',
        'username',
        'signKeyPub',
        'signKeyPrivateCiphertext'
      ];
      var serialized = account.serialize();
      assert.deepEqual(Object.keys(serialized), expected);

      done();
    });

    it('should return the correct values', function () {
      var ret = account.serialize();
      assert.deepEqual(ret.containerNameHmacKeyCiphertext, account.containerNameHmacKeyCiphertext);
      assert.deepEqual(ret.srpVerifier, account.srpVerifier);
      assert.deepEqual(ret.srpSalt, account.srpSalt);
      assert.deepEqual(ret.hmacKeyCiphertext, account.hmacKeyCiphertext);
      assert.deepEqual(ret.keypairCiphertext, account.keypairCiphertext);
      assert.deepEqual(ret.pubKey, account.pubKey);
      assert.deepEqual(ret.challengeKeySalt, account.challengeKeySalt);
      assert.deepEqual(ret.keypairSalt, account.keypairSalt);
      assert.deepEqual(ret.symkeyCiphertext, account.symkeyCiphertext);
      assert.deepEqual(ret.username, account.username);
      assert.deepEqual(ret.signKeyPub, account.signKeyPub);
      assert.deepEqual(ret.signKeyPrivateCiphertext, account.signKeyPrivateCiphertext);
    });
  });

  describe('encryptAndSign+verifyAndDecrypt()', function () {
    var alice;
    var aliceErr;
    var bob;
    var bobErr;
    var aliceSession;
    var bobSession;

    before(function (done) {

      crypton.generateAccount('alice', 'pass', function () {
        aliceErr = arguments[0];
        alice = arguments[1];

        crypton.authorize('alice', 'pass', function (err, rawSession) {
          if (err) throw err;
          aliceSession = rawSession;
        });

        crypton.generateAccount('bob', 'pass', function () {
          bobErr = arguments[0];
          bob = arguments[1];

          crypton.authorize('bob', 'pass', function (err, rawSession) {
            if (err) throw err;
            bobSession = rawSession;


            it('should be able to encrypt & sign & verify & decrypt', function (done) {
              var payload = "This is a secret message and whatnot.";

              // get bob peer
              aliceSession.getPeer("bob", function (err, peer) {
                var ret = peer.encryptAndSign(payload, aliceSession);
                assert(ret.ciphertext && ret.signature);

                var verified = bobSession.account.verifyAndDecrypt(ret, alicePeer);
                console.log(verified);
                assert(verified.cleartext && verified.verified);
                assert(verified.cleartext == payload);
                done();
              });
            });

          });

        }, {
          save: false
        });

      }, {
        save: false
      });

    });

  });

});
