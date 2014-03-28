/* Crypton Server, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Server.
 *
 * Crypton Server is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Server is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Server.  If not, see <http://www.gnu.org/licenses/>.
*/

describe('encryptAndSign+verifyAndDecrypt()', function () {
  this.timeout(100000);

  describe('encryptAndSign & verifyAndDecrypt test', function () {
    it('Should do SOMETHING!', function () {
      var alice;
      var aliceErr;
      var bob;
      var bobErr;
      var aliceSession;
      var bobSession;
      crypton.generateAccount('alice', 'pass', function () {
        aliceErr = arguments[0];
        alice = arguments[1];
        assert(alice);
        crypton.authorize('alice', 'pass', function (err, rawSession) {
          if (err) throw err;
          aliceSession = rawSession;
          assert(aliceSession);
        });
        crypton.generateAccount('bob', 'pass', function () {
          bobErr = arguments[0];
          bob = arguments[1];
          assert(bob);
          crypton.authorize('bob', 'pass', function (err, rawSession) {
            if (err) throw err;
            bobSession = rawSession;
            assert(bobSession);
            it('should be able to encrypt & sign & verify & decrypt', function (done) {
              var payload = "This is a secret message and whatnot.";
              // get bob peer
              aliceSession.getPeer("bob", function (err, peer) {
                var ret = peer.encryptAndSign(payload, aliceSession);
                assert(ret.ciphertext && ret.signature);
                var verified = bobSession.account.verifyAndDecrypt(ret, alicePeer);
                assert(verified.plaintext && verified.verified);
                assert(verified.plaintext == payload);
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
