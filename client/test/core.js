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
      assert.equal(crypton.version, '0.0.1');
    });

    it('should have the correct host', function () {
      assert.equal(crypton.host, 'localhost');
    });

    it('should have the correct port', function () {
      assert.equal(crypton.port, '2013');
    });

    it('should have the correct default cipher mode', function () {
      assert.equal(crypton.cipherOptions.mode, 'gcm');
    });
  });

  describe('url()', function () {
    it('should return the correct url', function () {
      assert.equal(crypton.url(), 'http://localhost:2013');
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
        'challengeKeySalt',
        'challengeKey',
        'keypairSalt',
        'keypairCiphertext',
        'containerNameHmacKeyCiphertext',
        'hmacKeyCiphertext',
        'pubKey',
        'symkeyCiphertext'
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
