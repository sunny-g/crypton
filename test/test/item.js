/* Crypton Server, Copyright 2015 SpiderOak, Inc.
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

describe('Item tests', function () {
  this.timeout(200000);

  var alice;
  var aliceSession;
  var itemHmacName;

  describe('Create Account', function () {
    it('Create Alice', function (done) {
      crypton.generateAccount('alice3', 'pass', function (err, acct) {
        if (err) throw err;
        assert(acct);
        alice = acct;
        done();
      });
    });

    it('Get Alice\'s session', function (done) {
      crypton.authorize('alice3', 'pass', function (err, sess) {
        if (err) throw err;
        aliceSession = sess;
        assert(sess);
        done();
      });
    });

    it('Create an Item', function (done) {
      var selfPeer = new crypton.Peer({
        session: aliceSession,
        pubKey: aliceSession.account.pubKey,
        signKeyPub: aliceSession.account.signKeyPub,
        signKeyPrivate: aliceSession.account.signKeyPrivate
      });
      selfPeer.trusted = true;

      aliceSession.getOrCreateItem('my-first-item', selfPeer, function (err, item) {
        if (err) {
          console.error(err);
          throw (err);
        }
        // assert(item);
        assert(item.sessionKey);
        assert(item.value);
        done();
      });
    });

  });
});
