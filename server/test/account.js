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
  it('should create a blank account object', function () {
    var account = new Account();
    assert(account instanceof Account);
    assert(JSON.stringify(account.serialize()) == JSON.stringify({}));
  });

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

  describe('generateChallenge()', function () {
    it('should generate a challengeKeyHash', function (done) {
      var account = new Account();
      account.challengeKey = [];
      account.generateChallenge(function (err) {
        if (err) throw err;
        assert.equal(typeof account.challengeKeyHash, 'string');
        done();
      });
    });

    it('should delete the challengeKey', function (done) {
      var account = new Account();
      account.challengeKey = [];
      account.generateChallenge(function (err) {
        assert.equal(typeof account.challengeKey, 'undefined');
        done();
      });
    });

    it('should fail if there is no challengeKey', function (done) {
      var account = new Account();
      account.generateChallenge(function (err) {
        assert.equal(err, 'Must supply challengeKey');
        done();
      });
    });
  });

  describe('verifyChallenge()', function () {
    it('should callback with err on wrong password', function (done) {
      var account = new Account();
      account.challengeKey = [];
      account.generateChallenge(function (err) {
        var response = [];
        account.verifyChallenge(response, function (err) {
          assert.equal(err, 'Incorrect password');
          done();
        });
      });
    });

    it('should callback without error on correct input', function (done) {
      var account = new Account();
      // pbkdf2 of 'bananas' and random salt
      var key = '[-1284768048,-920447856,-475398093,1331192739,-1763268843,1822534881,-85602294,1946893769]';
      account.challengeKey = key;
      account.generateChallenge(function (err) {
        // key would now be generated in browser with saved salt
        account.verifyChallenge(key, function (err) {
          if (err) throw err;
          done();
        });
      });
    });
  });

  describe('serialize()', function () {

  });

  describe('save()', function () {

  });

  describe('get()', function () {

  });
});

