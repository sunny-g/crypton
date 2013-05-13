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

// most of the transaction functions are simply
// HTTP calls, which are tested in integration tests

describe('Transactions', function () {
  describe('default properties', function () {
    it('should have the correct types array', function () {
      var tx = new crypton.Transaction(null);
      var expectedTypes = [
        'addAccount',
        'setBaseKeyring',
        'addContainer',
        'deleteContainer',
        'addContainerSessionKey',
        'addContainerSessionKeyShare',
        'addContainerRecord',
        'addMessage',
        'deleteMessage'
      ];

      assert.deepEqual(tx.types, expectedTypes);
    });
  });

  describe('save()', function () {
    // TODO how should we test this outside of integration tests?
  });

  describe('verify()', function () {
    it('should throw if there is no transaction id', function () {
      var err = null;
      var tx = new crypton.Transaction(null);

      try {
        tx.verify();
      } catch (e) {
        err = e;
      }

      assert.equal(err.message, 'Invalid transaction');
    });

    it('should not throw if there is a transaction id', function () {
      var err = null;
      var tx = new crypton.Transaction(null);
      tx.id = 'foo';

      try {
        tx.verify();
      } catch (e) {
        err = e;
      }

      assert.equal(err, null);
    });
  });

  describe('verifyChunk()', function () {
    it('should throw if not given chunk', function () {
      var err = null;
      var tx = new crypton.Transaction(null);

      try {
        tx.verifyChunk();
      } catch (e) {
        err = e;
      }

      assert.equal(err.message, 'Invalid transaction chunk type');
    });

    it('should throw if chunk has invalid type', function () {
      var err = null;
      var tx = new crypton.Transaction(null);

      try {
        tx.verifyChunk({
          type: 'nope'
        });
      } catch (e) {
        err = e;
      }

      assert.equal(err.message, 'Invalid transaction chunk type');
    });

    it('should not throw if chunk has valid type', function () {
      var err = null;
      var tx = new crypton.Transaction(null);

      try {
        tx.verifyChunk({
          type: 'addContainer'
        });
      } catch (e) {
        err = e;
      }

      assert.equal(err, null);
    });
  });
});
