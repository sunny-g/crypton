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
        done();
      });
    });

    //Creating 3 containers
    it('Creating container1', function (done) {
      this.session.create('container1', function (err, container) {
        assert.equal(err, null);
        assert.equal(container.name, 'container1');
        done();
      });
    });

    it('Creating container2', function (done) {
      this.session.create('container2', function (err, container) {
        assert.equal(err, null);
        assert.equal(container.name, 'container2');
        done();
      });
    });

    it('Creating container3', function (done) {
      this.session.create('container3', function (err, container) {
        assert.equal(err, null);
        assert.equal(container.name, 'container3');
        done();
      });
    });

    it('Confirming we have 3 new containers', function () {
      assert.equal(this.session.containers.length - this.before, 3);
    });

    it('Deleting container2', function (done) {
      this.session.deleteContainer('container2', function (err) {
        assert.equal(err, undefined);
        done();
      });
    });

    it('Checking cache was updated', function (done) {
      assert.equal(this.session.containers.length - this.before, 2);
      done();
    });

    it('Deleting container1', function (done) {
      this.session.deleteContainer('container1', function(err) {
        assert.equal(err, undefined);
        done();
      });
    });

    it('Checking cache was updated', function (done) {
      assert.equal(this.session.containers.length - this.before, 1);
      done();
    });
  });
});
