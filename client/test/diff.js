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

// These are shallow tests to ensure compatibility
// with crypton if the diff library is switched out.
// We will assume that the diff library is
// well tested including edge cases

describe('Differ', function () {
  it('should return null if unchanged', function () {
    var old = {};
    var current = {};
    var delta = crypton.diff.create(old, current);
    assert.equal(delta, null);
  });

  // TODO what other types of structures should we test here?
  it('should return the appropriate output for changes', function () {
    var old = {};
    var current = {
      foo: {
        bar: 'baz'
      }
    };
    var delta = crypton.diff.create(old, current);
    assert.deepEqual(delta, { foo: [ { bar: 'baz' } ] });
  });
});

describe('Patcher', function () {
  it('should return null if given null delta', function () {
    var old = {};
    var delta = null;
    var current = crypton.diff.apply(old, delta);
    assert.equal(current, null);
  });

  // TODO how else should we test this?
  // TODO should we make the abstraction async and wrap patch() in a try/catch?
  it('should err if given non-null non-object delta', function () {
    var old = {};
    var delta = [ { foo: { bar: [ 'baz' ] } } ];
    try {
      var current = crypton.diff.apply(delta, old);
    } catch (e) {
      assert.equal(e.message, 'cannot apply patch at "/": object expected');
    }
  });

  it('should not change anything if given blank input', function () {
    var old = {};
    var delta = {};
    var current = crypton.diff.apply(delta, old);
    assert.deepEqual(old, current);
  });

  // TODO how else should we test this?
  it('should return the appropriate output for changes', function () {
    var old = {};
    var delta = { foo: [ { bar: 'baz' } ] };
    var current = crypton.diff.apply(delta, old);
    assert.deepEqual(current, {
      foo: {
        bar: 'baz'
      }
    });
  });
});
