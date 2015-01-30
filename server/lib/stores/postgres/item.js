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

var datastore = require('./');
var connect = datastore.connect;

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
      // text: '\
      //   select \
      //     item.*, \
      //     item_session_key_share.session_key_ciphertext \
      //   from item \
      //     join item_session_key using (item_session_key_id) \
      //     join item_session_key_share using (item_session_key_id) \
      //   where item_session_key.supercede_time is null \
      //     and item_session_key_share.deletion_time is null \
      //     and item.name_hmac = $1 \
      //     and item_session_key_share.to_account_id = $2 \
      //   order by item.creation_time, item_id asc',
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
      done();

      if (err) {
        return callback(err);
      }

      if (!result.rows.length) {
        return callback('Item does not exist');
      }

      // massage
      // XXXddahl: do this in the caller:
      //           var value = result.rows[0].toString();
      console.log(result.rows[0]);
      callback(null, result.rows[0]);
    });
  });
};

exports.saveItem = function (itemNameHmac, accountId, value, callback) {
  connect(function (client, done) {
    // Query for item first, make sure ownership is correct
    var ownershipQuery = {
      text: 'select account_id, name_hmac \
        from item \
        where account_id = $1 and name_hmac = $2 \
        limit 1',
      values: [accountId, itemNameHmac]
    };
    client.query(ownershipQuery, function (err, result) {
      if (err) {
        return callback(err);
        done();
      }

      console.log(result);

      if (result.rows.length == 1) {
        // item does exist
        var updateQuery = {
          /*jslint multistr: true*/
          text: '\
            update \
            item set value = $1 \
            where account_id = $2 and name_hmac = $3',
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
          // if (!result.rows.length) {
          //   return callback('Update failed');
          // }
          callback(null);
          done();
        });
      }
    });
  });
};

exports.createItem =
function (itemNameHmac, accountId, value, wrappedSessionKey, callback) {
  console.log(arguments);
  connect(function (client, done) {
    // do multiple queries before commiting so we can rollback if needed
    client.query('begin');
    console.log('createItem() ..........................................');

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
      console.log('ItemQuery');
      if (err) {
        console.error(err);
        client.query('rollback');
        done();
        return callback(err);
      }
      console.log('result: ', result);
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
        console.log('sessionKeyQuery');
        if (err) {
          console.error(err);
          client.query('rollback');
          done();
          return callback(err);
        }
        console.log(result);
        var itemSessionKeyId = result.rows[0].item_session_key_id;

        // sessionkey share query
        var sessionKeyShareQuery = {
          text: 'insert into item_session_key_share \
            ( item_session_key_id, account_id, to_account_id, session_key_ciphertext  ) \
            values ( $1, $2, $3, $4 )',
          values: [itemSessionKeyId, accountId, accountId, wrappedSessionKey]
        };

        client.query(sessionKeyShareQuery, function (err, result) {
          console.log('sessionKeyShareQuery');
          if (err) {
            console.error(err);
            client.query('rollback');
            done();
            return callback(err);
          }
          // success
          client.query('commit');
          done();
          var metadata = { itemNameHmac: itemNameHmac, modTime: modTime };
          callback(null, metadata);
        });
      });
    });
  });
};

// XXX shareItem

// XXX unShareItem

// XXX removeItem
