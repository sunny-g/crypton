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

describe('Core functionality', function () {
  this.timeout(15000);

  var REAL_VERSION = new String(crypton.version);

  describe('Account generation', function () {
    it('should refuse registrations without a username', function (done) {
      crypton.generateAccount('', '', function (err, account) {
        assert.equal(err, 'Must supply username and passphrase');
        done();
      });
    });

    it('should refuse registrations without a passphrase', function (done) {
      crypton.generateAccount('notSoSmart', '', function (err, account) {
        assert.equal(err, 'Must supply username and passphrase');
        done();
      });
    });

    it('should refuse registrations when versions mismatch', function (done) {
      crypton.version = 'pizza';
      crypton.generateAccount('mismatchname', '', function (err, account) {
        assert.equal(err, 'Server and client version mismatch');
        crypton.version = REAL_VERSION;
        done();
      });
    });

    it('should accept registrations without an existing username', function (done) {
      crypton.generateAccount('notSoSmart', 'pass', function (err, account) {
        assert.equal(err, null);
        done();
      });
    });

    it('should not accept registrations with an existing username', function (done) {
      crypton.generateAccount('notSoSmart', 'pass', function (err, account) {
        assert.equal(err, 'Username already taken.');
        done();
      });
    });
  });

  describe('Authorization', function () {
    it('should accept correct username/passphrase combinations', function (done) {
      crypton.authorize('notSoSmart', 'pass', function (err, session) {
        assert.equal(err, null);
        assert.equal(session.account.username, 'notSoSmart');
        done();
      });
    });

    it('should refuse invalid usernames', function (done) {
      crypton.authorize('iDontExist', 'neitherDoI', function (err, session) {
        assert.equal(err, 'Account not found.');
        done();
      });
    });

    it('should refuse authorization when verisons mismatch', function (done) {
      crypton.verison = 'pizzapizza';
      crypton.authorize('notSoSmart', 'pass', function (err, session) {
        assert.equal(err, 'Server and client verison mismatch');
        crypton.verison = REAL_VERSION;
        done();
      });
    });

    it('should refuse incorrect passphrases', function (done) {
      crypton.authorize('notSoSmart', 'notMyPassword', function (err, session) {
        assert.equal(err, 'Incorrect password');
        done();
      });
    });
  });
});
