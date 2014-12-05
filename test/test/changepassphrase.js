/* Crypton Server, Copyright 2014 SpiderOak, Inc.
 *
 * This file is part of Crypton test suite.
 *
 * Crypton is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton.  If not, see <http://www.gnu.org/licenses/>.
*/

describe('Change Passphrase', function () {
  this.timeout(200000);
  describe('Account generation', function () {
    it('generate account, change passphrase without error', function (done) {
      crypton.generateAccount('drevil', 'password', function (err, account) {
        console.log(err);
        assert.equal(err, null);
        if (err) {
          done();
        }
        var _testUICallback = false;

        // Authorize
        var options = { check: true };
        crypton.authorize('drevil', 'password', function (err, session) {
          if (err) {
            console.error(err);
            done();
          }
          // assert(session != null);
          assert.equal(err, null);

          function cb (err, account) {
            console.log('TEST CALLBACK().............................');
            assert.equal(err, null);
            if (err) {
              console.error('cb error!');
              console.error(err);
              done();
            }
            console.log('auth callback');
            // console.log(session.account);
            assert.equal(_testUICallback, true);
            assert.equal(session.account.username, 'drevil'); // we have been handed the account
            done();
          }

          function uiProgressCallback () {
            console.log('uiProgressCallback ()');
            _testUICallback = true;
          }

          try {
            session.account.changePassphrase('password', 'foobarstrongerpass', cb, uiProgressCallback, false);
          } catch (ex) {
            console.log(ex);
            console.log(ex.stack);
            done();
          }
        }, options);

      });
    });

    it('test changed passphrase', function (done) {
      crypton.authorize('drevil', 'foobarstrongerpass', function (err, newSession) {
        if (err) {
          console.error(err);
          done();
        }

        console.log('new session: ', newSession);
        assert.isDefined(newSession);
        assert.equal(newSession.account.username, 'drevil');
        done();
      }); // end 2nd auth
    }); // end it()

  });
});
