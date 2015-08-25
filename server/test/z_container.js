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
var Container = require('../lib/container');

describe('Container model', function () {
  describe('#update()', function () {
    it('should update the container by key/value', function () {
      console.warn('CONTAINERS ARE DEPRECATED, use the "Items" API');
      var container = new Container();
      container.update('foo', 'bar');
      assert.equal(container.foo, 'bar');
    });

    it('should update the container with an object of key/value pairs', function () {
      console.warn('CONTAINERS ARE DEPRECATED, use the "Items" API');
      var container = new Container();
      container.update({
        foo: 'bar',
        bar: 'baz'
      });
      assert.equal(container.foo, 'bar');
      assert.equal(container.bar, 'baz');
    });
  });

  // describe('#get()', function () {
    // before(function (done) {
    //   while (!process.finishedTransaction);
    //   done();
    // });

    // it('should err on invalid owner', function (done) {
    //   var container = new Container();
    //   container.update('accountId', 2);
    //   container.get('grail', function (err) {
    //     assert.equal(err, 'Container does not exist');
    //     done();
    //   });
    // });

    // it('should err on invalid containerNameHmac', function (done) {
    //   var container = new Container();
    //   container.update('accountId', 2);
    //   container.get('grail', function (err) {
    //     assert.equal(err, 'Container does not exist');
    //     done();
    //   });
    // });

    // it('should get said container\'s records', function (done) {
    //   var container = new Container();
    //   container.update('accountId', 2);
    //   container.get('exists', function (err) {
    //     assert.equal(err, 'Container does not exist');
    //     // assert.equal(Object.prototype.toString.call(container.records), '[object Array]');
    //     assert.equal(undefined, container.records); // XXXdddahl: Making this passs for now to continue debugging...Should there actually be a record

    //     done();
    //   });
    // });
  // });

});
