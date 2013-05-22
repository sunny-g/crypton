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

describe('Container functionality', function () {
  var session;

  before(function (done) {
    crypton.authorize('notSoSmart', '', function (err, rawSession) {
      if (err) throw err;
      session = rawSession;
      done();
    });
  });

  describe('save()', function () {
    // TODO flow control plz
    it('should save container changes', function (done) {
      this.timeout(10000);
      session.create('tupperware', function (err, container) {
        container.add('properties', function (err) {
          container.get('properties', function (err, properties) {
            properties.color = 'blue';
            setTimeout(function () { // hack to get around commit poll race condition
              container.save(function (err) {
                setTimeout(function () {
                crypton.authorize('notSoSmart', '', function (err, session2) {
                  session2.load('tupperware', function (err, container2) {
                    container2.get('properties', function (err, properties2) {
                      assert.equal(err, null);
                      assert.equal(properties2.color, 'blue');
                      done();
                    });
                  });
                });
                }, 3000);
              });
            }, 3000);
          });
        }); // -_-
      });
    });
  });

  describe('getHistory()', function () {
    it('should get container records', function (done) {
      session.load('tupperware', function (err, container) {
        container.getHistory(function (err, records) {
          assert.equal(err, null);
          // TODO is there a better way to test the integrity of the response?
          assert.equal(records[0].accountId, 1);
          done();
        });
      });
    });
  });

  describe('sync()', function () {
    // TODO flow control plz
    it('should pull changes into an instantiated container', function (done) {
      this.timeout(10000);
      session.containers = []; // force the session to load from server
      session.load('tupperware', function (err, container) {
        session.containers = [];
        session.load('tupperware', function (err, container2) {
          container.get('properties', function (err, properties) {
            properties.color = 'green';
            container.save(function (err) {
              setTimeout(function () { // hack to get around commit poll race condition
              container2.sync(function () {
                setTimeout(function () {
                container2.get('properties', function (err, properties2) {
                  assert.equal(err, null);
                  assert.equal(properties2.color, 'green');
                  done();
                });
                }, 2000);
              });
              }, 2000);
            });
          });
        });
      });
    });
  });
});
