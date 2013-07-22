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

var assert = require('assert');
var Account = require('../lib/account');

describe('Account model', function () {
  describe('update()', function () {
    it('should update the account by key/value', function () {
      var account = new Account();
      account.update('foo', 'bar');
      assert.equal(account.foo, 'bar');
    });

    it('should update the account with an object of key/value pairs', function () {
      var account = new Account();
      account.update({
        foo: 'bar',
        bar: 'baz'
      });
      assert.equal(account.foo, 'bar');
      assert.equal(account.bar, 'baz');
    });
  });

  describe('hashChallengeKey()', function () {
    it('should generate a challengeKeyHash', function (done) {
      var account = new Account();
      var challengeKey = [];

      account.hashChallengeKey(challengeKey, function (err) {
        if (err) throw err;
        assert.equal(typeof account.challengeKeyHash, 'string');
        assert.equal(account.challengeKeyHash.length, 60); // bcrypt output length
        done();
      });
    });

    it('should not put raw challengeKey into the Account object', function (done) {
      var account = new Account();
      var challengeKey = [];
      account.hashChallengeKey(challengeKey, function (err) {
        assert.equal(typeof account.challengeKey, 'undefined');
        done();
      });
    });

    it('should fail if there is no challengeKey', function (done) {
      var account = new Account();
      var challengeKey = null;

      account.hashChallengeKey(challengeKey, function (err) {
        assert.equal(err, 'Must supply challengeKey');
        done();
      });
    });
  });

  describe('verifyChallenge()', function () {
    it('should callback without error on correct input', function (done) {
      var account = new Account();
      // pbkdf2 of 'bananas' and random salt
      var challengeKey = '[-1284768048,-920447856,-475398093,1331192739,-1763268843,1822534881,-85602294,1946893769]';

      account.hashChallengeKey(challengeKey, function (err) {
        // key would now be generated in browser with saved salt
        account.verifyChallenge(challengeKey, function (err) {
          if (err) throw err;
          done();
        });
      });
    });

    it('should callback with err on wrong password', function (done) {
      var account = new Account();
      var challengeKey = [];

      account.hashChallengeKey(challengeKey, function (err) {
        var response = '[1234]';
        account.verifyChallenge(response, function (err) {
          assert.equal(err, 'Incorrect password');
          done();
        });
      });
    });
  });

  describe('toJSON()', function () {
    it('should do return an object', function () {
      var account = new Account();
      var ret = account.toJSON();
      assert.equal(typeof ret, 'object');
    });

    it('should do return account properties', function () {
      var account = new Account();
      account.update('foo', 'bar');
      var ret = account.toJSON();
      assert.equal(ret.foo, 'bar');
    });
  });

  describe('save()', function () {
    it('should save valid accounts', function (done) {
      var account = new Account();

      var user = {
        username: 'pizza',
        keypairSalt: '[1,2,3]',
        keypairCiphertext: { keypair: 'ciphertext' },
        pubKey: { pub: 'key' },
        challengeKeyHash: 'string',
        challengeKeySalt: '[1,2,3]',
        symKeyCiphertext: { sym: 'key' },
        containerNameHmacKeyCiphertext: '[1,2,3]',
        hmacKeyCiphertext: '[1,2,3]'
      };

      account.update(user);

      account.save(function (err) {
        if (err) throw err;
        done();
      });
    });

    it('should err out for invalid accounts', function (done) {
      var account = new Account();

      account.save(function (err) {
        assert(err !== null);
        done();
      });
    });
  });

  describe('get()', function () {
    it('should fill out account object', function (done) {
      var account = new Account();
      account.get('pizza', function (err) {
        if (err) throw err;
        assert.equal(account.username, 'pizza');
        done();
      });
    });

    it('should callback with error if given nonexistant username', function (done) {
      var account = new Account();
      account.get('pizzasaurus', function (err) {
        assert.equal(err, 'Account not found.');
        done();
      });
    });
  });
});

