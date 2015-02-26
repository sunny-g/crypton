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

'use strict';

var app = require('../app');
var db = app.datastore;

/**!
 * # Item()
 *
 * ````
 * var item = new Item();
 * ````
 */
var Item = module.exports = function Item () {};

/**!
 * ### get(itemNameHmac, callback)
 * Retrieve value from the database for the specified `itemNameHmac`
 *
 * Adds value to item object and calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {Function} callback
 */
Item.prototype.get = function (itemNameHmac, callback) {
  app.log('debug', 'getting item');

  var that = this;

  db.getItemValue(itemNameHmac, that.accountId, function (err, record) {
    if (err) {
      callback(err);
      return;
    }

    that.update('rawData', record);
    callback(null);
  });
};

/**!
 * ### update()
 * Update one or a set of keys in the item object
 *
 * @param {String} key
 * @param {Object} value
 *
 * or
 *
 * @param {Object} input
 */
Item.prototype.update = function () {
  // XXXddahl: validate object keys/values against 'valid keys'
  if (typeof arguments[0] == 'object') {
    for (var key in arguments[0]) {
      this[key] = arguments[0][key];
    }
  }

  // update('key', 'value')
  else if (typeof arguments[0] == 'string' && arguments[1]) {
    this[arguments[0]] = arguments[1];
  }
};

/**!
 * ### save()
 * Save the current state of the Item
 *
 * @param {Function} callback
 *
 */
Item.prototype.save = function item_save(callback) {
  app.log('debug', 'Saving item');

  var that = this;
  db.saveItem(that.itemNameHmac, that.accountId, that.value, function (err, result) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, result);
  });
};

/**!
 * ### create()
 * Create an Item
 *
 * @param {Function} callback
 *
 */
Item.prototype.create = function item_create(callback) {
  app.log('debug', 'creating item');

  var that = this;
  db.createItem(that.itemNameHmac, that.accountId,
                that.value, that.wrappedSessionKey,
  function (err, itemMetaData) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, itemMetaData);
  });
};

/**!
 * ### remove()
 * Remove an Item
 *
 * @param {Function} callback
 *
 */
Item.prototype.remove = function item_remove(callback) {
  app.log('debug', 'remove item');

  var that = this;
  db.removeItem(that.itemNameHmac, that.accountId,
  function (err, result) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, result);
  });
};

/**!
 * ### share()
 * Share an Item
 *
 * @param {Number} toAccountId
 * @param {Function} callback
 *
 */
Item.prototype.share = function item_share(callback) {
  app.log('debug', 'share item');

  var that = this;
  db.shareItem(that.itemNameHmac, that.sessionKeyCiphertext,
               that.toUsername, that.accountId,
  function (err, result) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, result);
  });
};
