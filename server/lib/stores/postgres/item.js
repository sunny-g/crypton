/* Crypton Server, Copyright 2015 SpiderOak, Inc.
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

var datastore = require('./');
var connect = datastore.connect;
var app = process.app;
var pg = require('pg');

/**!
 * ### getItemValue(itemNameHmac, accountId, callback)
 * Retrieve value for given `itemNameHmac` accessible by `accountId`
 *
 * Calls back with value and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {Number} accountId
 * @param {Function} callback
 */
exports.getItemValue = function (itemNameHmac, accountId, callback) {
  var toAccountId = accountId; // XXXddahl: need to allow loading of items by non-owners

  console.log('getItemValue()', arguments);

  connect(function (client, done) {
    var query = {
      // TODO limit to to_account_id
      /*jslint multistr: true*/
      text: 'select i.item_id, i.value, i.name_hmac, i.account_id, \
             i.modified_time, sk.item_id, \
             s.session_key_ciphertext \
             from item i \
             left join item_session_key sk on i.item_id = sk.item_id \
             left join item_session_key_share s \
                       on sk.item_session_key_id = s.item_session_key_id \
             where \
             i.name_hmac = $1 and \
             i.account_id = $2 and \
             i.deletion_time is null and \
             sk.supercede_time is null and \
             s.deletion_time is null and \
             s.to_account_id = $3 \
             limit 1',
      /*jslint multistr: false*/
      values: [
        itemNameHmac,
        accountId,
        toAccountId
      ]
    };

    client.query(query, function (err, result) {
      if (err) {
        done();
        return callback(err);
      }

      if (result.rowCount != 1) {
        return callback('Item does not exist');
      }

      done();
      var rawData = {
        ciphertext: JSON.parse(result.rows[0].value.toString()),
        modTime: Date.parse(result.rows[0].modified_time),
        wrappedSessionKey: result.rows[0].session_key_ciphertext
      };
      console.log(rawData);
      callback(null, rawData);
    });
  });
};

/**!
 * ### saveItem(itemNameHmac, accountId, value, callback)
 * Save Item
 *
 * Calls back with value and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {Number} accountId
 * @param {String} value
 * @param {Function} callback
 */
exports.saveItem = function (itemNameHmac, accountId, value, callback) {
  connect(function (client, done) {
    var updateQuery = {
      /*jslint multistr: true*/
      text: '\
        update \
        item set value = $1 \
        where account_id = $2 and name_hmac = $3 returning modified_time',
      /*jslint multistr: false*/
      values: [
        value,
        accountId,
        itemNameHmac
      ]
    };

    client.query(updateQuery, function (err, result) {
      if (err) {
        return callback(err);
      }
      var modTime;
      try {
        modTime = result.rows[0].modified_time;
      } catch (ex) {
        console.error(ex);
        console.error(ex.stack);
      }
      callback(null, { modTime: Date.parse(modTime),
                       itemNameHmac: itemNameHmac
                     });
      done();
    });
  });
};

/**!
 * ### createItem(itemNameHmac, accountId, value, callback)
 * Save Item
 *
 * Calls back with value and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {Number} accountId
 * @param {String} value
 * @param {Function} callback
 */
exports.createItem =
function (itemNameHmac, accountId, value, wrappedSessionKey, callback) {
  connect(function (client, done) {
    client.query('begin');
    var query = {
      /*jslint multistr: true*/
      text: '\
        insert into item (account_id, name_hmac, value) \
        values ($1, $2, $3) \
        returning item_id, modified_time',
      /*jslint multistr: false*/
      values: [
        accountId,
        itemNameHmac,
        value
      ]
    };

    client.query(query, function (err, result) {
      if (err) {
        console.error(err);
        client.query('rollback');
        done();
        return callback(err);
      }
      var itemId = result.rows[0].item_id;
      var modTime = result.rows[0].modified_time;

      // sessionkey query
      var sessionKeyQuery = {
        text: 'insert into item_session_key \
          ( item_id, account_id ) \
          values ( $1, $2 ) returning item_session_key_id',
        values: [itemId, accountId]
      };

      client.query(sessionKeyQuery, function (err, result) {
        if (err) {
          console.error(err);
          client.query('rollback');
          done();
          return callback(err);
        }
        var itemSessionKeyId = result.rows[0].item_session_key_id;

        // sessionkey share query
        var sessionKeyShareQuery = {
          text: 'insert into item_session_key_share \
            ( item_session_key_id, account_id, to_account_id, session_key_ciphertext  ) \
            values ( $1, $2, $3, $4 )',
          values: [itemSessionKeyId, accountId, accountId, wrappedSessionKey]
        };

        client.query(sessionKeyShareQuery, function (err, result) {
          if (err) {
            console.error(err);
            client.query('rollback');
            done();
            return callback(err);
          }
          // success
          client.query('commit');
          done();
          var metadata = { itemNameHmac: itemNameHmac, modTime: Date.parse(modTime) };
          callback(null, metadata);
        });
      });
    });
  });
};

/**!
 * ### removeItem(itemNameHmac, accountId, value, callback)
 * Remove Item
 *
 * Calls back with value and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {Number} accountId
 * @param {String} value
 * @param {Function} callback
 */
exports.removeItem =
function (itemNameHmac, accountId, callback) {
  connect(function (client, done) {
    client.query('begin');
    var query = {
      /*jslint multistr: true*/
      text: '\
        delete from item where name_hmac = $1 and account_id = $2',
        // All child rows in item_session_key &
        // item_session_key_share will cascade delete
      /*jslint multistr: false*/
      values: [
        itemNameHmac,
        accountId
      ]
    };

    client.query(query, function (err, result) {
      if (err) {
        console.error(err);
        done();
        return callback(err);
      }
      client.query('commit');
      done();
      return callback(null, result.rows[0]);
    });
  });
};

/**!
 * ### shareItem(itemNameHmac, fromAccountId, toAccountId, callback)
 * Share Item
 *
 * Calls back with value and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} itemNameHmac
 * @param {String} sessionKeyCiphertext
 * @param {String} toUsername
 * @param {Number} fromAccountId
 * @param {Function} callback
 */
exports.shareItem =
function (itemNameHmac, sessionKeyCiphertext,
          toUsername, fromAccountId, callback) {
  console.log('shareItem()');
  console.log(arguments);

  var toAccountId;
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'select account_id, username \
             from account \
             where \
             username = $1',
      /*jslint multistr: false*/
      values: [
        toUsername
      ]
    };

    client.query(query, function (err, result) {
      if (err) {
        client.query('rollback');
        done();
        console.error(err);
        return callback(err);
      }

      if (result.rowCount != 1) {
        return callback('Account with username' + toUsername  + 'does not exist');
      }

      toAccountId = result.rows[0].account_id;
      console.log('toAccountId: ');
      console.log(toAccountId);
      console.log(result.rows[0].username);

      client.query('begin');
      // We have a user now, we need to insert item_session_key!
      var itemSessionKeyQuery = {
        /*jslint multistr: true*/
        text: 'select item_session_key_id from item_session_key \
               where item_id = \
               (select item_id from item where name_hmac = $1) \
               and account_id = $2;',
        /*jslint multistr: false*/
        values: [
          itemNameHmac,
          fromAccountId
        ]
      };

      client.query(itemSessionKeyQuery, function (err, result) {
        if (err) {
          client.query('rollback');
          done();
          console.error(err);
          return callback(err);
        }

        if (result.rowCount != 1) {
          return callback('item_session_key lookup failed');
        }

        var itemSessionKeyId = result.rows[0].item_session_key_id;
        console.log('itemSessionKeyId', itemSessionKeyId);
        // We have a user now, we need to insert item_session_key_share
        var itemSessionKeyShareQuery = {
          /*jslint multistr: true*/
          text: 'insert into item_session_key_share \
                 (item_session_key_id, account_id, \
                 to_account_id, session_key_ciphertext) values \
                 ($1, $2, $3, $4) \
                 returning item_session_key_share_id;',
          /*jslint multistr: false*/
          values: [
            itemSessionKeyId,
            fromAccountId,
            toAccountId,
            sessionKeyCiphertext
          ]
        };

        client.query(itemSessionKeyShareQuery, function (err, result) {
          if (err) {
            client.query('rollback');
            done();
            console.error(err);
            return callback(err);
          }

          if (result.rowCount != 1) {
            client.query('rollback');
            done();
            return callback('item_session_key_share insert failed');
          }
          var itemSessionKeyShareId =
            result.rows[0].item_session_key_share_id;

          client.query('commit');
          console.log({itemSessionKeyShareId: itemSessionKeyShareId,
                       itemSessionKeyId: itemSessionKeyId,
                       toAccountId: toAccountId,
                       fromAccountId: fromAccountId
                      });
          return callback(null, {success: true});
        });
      });
    });
  });
};

// XXXddahl: unShareItem

/**!
 * Listen for item update notifications
 *
 * Upon item value update,
 * the database will NOTIFY on the item_update channel
 * with the following payload format:
 *
 * `itemNameHmac:fromAccountId:toAccountId`
 *
 * where account IDs refer to those in item_session_key_share.
 *
 * If the item value is created by the item's creator
 * every account with access to the item that isn't the creator
 * will be notified by this server if they have an active websocket
 * XXXddahl: If not, a message is sent
 */
(function listenForItemUpdates () {
  app.log('debug', 'listening for item updates');

  var config = process.app.config.database;
  var client = new pg.Client(config);
  client.connect();
  client.query('listen "SharedItemUpdated"');

  client.on('notification', function (data) {
    app.log('SharedItemUpdated', JSON.stringify(data));

    var payload = data.payload.split(' ');
    var itemNameHmac = payload[0];
    var toAccountId = payload[1];
    var fromAccountId = payload[2];

    // if a client has written to their own container we
    // won't need to let them know it was updated
    // TODO perhaps this should be disabled in the case
    // where the author edited something in a separate window
    if (fromAccountId == toAccountId) {
      // return; XXXddahl: creator is going to be nmotified for now...
    }

    if (app.clients[toAccountId]) {
      app.clients[toAccountId].emit('itemUpdated', itemNameHmac);
    } else {
      // XXXddahl: Can we store a message for later in Redis???
    }
  });
})();
