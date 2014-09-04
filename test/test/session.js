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

describe('Session functionality', function () {
  this.timeout(15000);

  describe('create()', function () {
    before(function (done) {
      var that = this;

      crypton.authorize('notSoSmart', 'pass', function (err, session) {
        if (err) throw err;
        that.session = session;
        done();
      });
    });

    it('should create a container with a valid name', function (done) {
      this.session.create('myContainer', function (err, container) {
        assert.equal(err, null);
        done();
      });
    });
  });

  describe('load()', function () {
    before(function (done) {
      var that = this;

      crypton.authorize('notSoSmart', 'pass', function (err, session) {
        if (err) throw err;
        that.session = session;
        done();
      });
    });

    it('should err on non-existant container', function (done) {
      this.session.load('grail', function (err, container) {
        // server does not divulge container nonexistence
        assert.equal(err, 'No new records');
        done();
      });
    });

    it('should load an existing container', function (done) {
      this.session.load('myContainer', function (err, container) {
        assert.equal(err, null);

        var expectedKeys = [
          'keys',
          'session',
          'recordCount',
          'recordIndex',
          'versions',
          'version',
          'name',
          'nameHmac',
          'sessionKey'
        ];

        assert.deepEqual(Object.keys(container), expectedKeys);
        done();
      });
    });
  });

  describe('deleteContainer()', function () {
    before(function (done) {
      var that = this;

      crypton.authorize('notSoSmart', 'pass', function (err, session) {
        if (err) throw err;
        that.session = session;
        that.before = that.session.containers.length;

        //creating the container
        that.session.create('container1', function (err, container) {
          assert.equal(err, null);
          assert.equal(container.name, 'container1');
        });
        done();
      });
    });

    it('should delete the container with no errors', function (done) {
      this.session.deleteContainer('container1', function (err, container) {
        assert.equal(err, undefined);
        done();
      });
    });

    it('should not load deleted container', function (done) {
      this.session.load('container1', function (err, container) {
        assert.notEqual(err, null);
        done();
      });
    });

    it('should check cache was updated correctly', function (done) {
      assert.equal(this.before, this.session.containers.length);
      done();
    });
  });
});
