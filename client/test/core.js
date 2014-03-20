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

describe('Core', function () {
  before(function () {
    sjcl.random.setDefaultParanoia(0);
  });

  describe('default properties', function () {
    it('should have the correct version', function () {
      assert.equal(crypton.version, '0.0.2');
    });

    it('should have the correct host', function () {
      assert.equal(crypton.host, 'localhost');
    });

    it('should have the correct port', function () {
      assert.equal(crypton.port, '443');
    });

    it('should have the correct default cipher mode', function () {
      assert.equal(crypton.cipherOptions.mode, 'gcm');
    });
  });

  describe('url()', function () {
    it('should return the correct url', function () {
      assert.equal(crypton.url(), 'https://localhost:443');
    });
  });

  describe('randomBytes()', function () {
    it('should return a random array', function () {
      var random = crypton.randomBytes();
      //assert(random.length > 0);
      //dump(random);
      // TODO testing speed presents a race condition with entropy generator
      // how can we manually seed this?
    });
  });

  describe('constEqual()', function () {
    it('should return true to same string', function () {
      assert(crypton.constEqual('somestring', 'somestring'));
    });

    it('should return false to same prefix but different length strings', function () {
      assert(!crypton.constEqual('somestring', 'somestringdifferent'));
    });

    it('should return false to same postfix but different length strings', function () {
      assert(!crypton.constEqual('differentsomestring', 'somestring'));
    });

    it('should return false for undefined', function() {
      assert(!crypton.constEqual('somestring', undefined));
    });

    it('should return false for int', function() {
      assert(!crypton.constEqual('somestring', 42));
    });

    it('should return false for array', function() {
      var test_array = new Array();
      test_array[0] = "4";
      test_array[1] = "2";
      assert(!crypton.constEqual('somestring', test_array));
    });
  });

  describe('generateAccount()', function () {
    var err;
    var user;

    before(function (done) {
      crypton.generateAccount('user', 'pass', function () {
        err = arguments[0];
        user = arguments[1];
        done();
      }, {
        save: false
      });
    });

    it('should exist', function () {
      assert(typeof crypton.generateAccount == 'function');
    });

    it('should generate the correct data', function (done) {
      assert(err == null);
      assert(user !== undefined);

      var fields = [
        'username',
        'srpSalt',
        'srpVerifier',
        'keypairSalt',
        'keypairCiphertext',
        'containerNameHmacKeyCiphertext',
        'hmacKeyCiphertext',
        'pubKey',
        'symKeyCiphertext',
        'signKeyPub',
        'signKeyPrivateCiphertext'
      ];

      for (var i in fields) {
        assert(typeof user[fields[i]] == 'string');
      }

      done();
    });
  });

  describe('account authorization', function () {
    it('should exist', function () {
      assert(typeof crypton.authorize == 'function');
    });

    // TODO should we just test this functionality in the integration tests?:q
  });
});
