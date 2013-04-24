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
var Transaction = require('../lib/transaction');

describe('Transaction model', function () {
  it('should create a blank transaction object', function () {
    var tx = new Transaction();
    assert(tx instanceof Transaction);
  });

  var token;
  describe('#create()', function () {
    it('should add a token to the object', function (done) {
      var accountId = 2; // account from account lib tests
      var tx = new Transaction();
      tx.create(accountId, function (err) {
        assert.equal(err, null);
        assert.exist(tx.token);
        token = tx.token;
        done();
      });
    });
  });

  describe('#get()', function () {
    it('should err on invalid token', function (done) {
      var tx = new Transaction();
      tx.get(666, function (err) {
        assert.equal(err, null);
        done();
      });
    });

    it('should get the created transaction', function (done) {
      var tx = new Transaction();
      tx.get(token, function (err) {
        assert.equal(err, null);
        assert.equal(tx.numOperations, 0);
        done();
      });
    });
  });
});
