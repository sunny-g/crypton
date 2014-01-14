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
 * ### getAllMessages(accountId, callback)
 * Retrieve all messages for given `accountId`
 *
 * Calls back with array of messages and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {accountId} accountId
 * @param {Function} callback
 */
datastore.getAllMessages = function (accountId, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'select * from message where \
        to_account_id = $1 and \
        deletion_time is null \
        order by creation_time',
       /*jslint multistr: false*/
      values: [
        accountId
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        callback(err);
        return;
      }

      // massage
      var records = [];
      result.rows.forEach(function (row) {
        row = datastore.util.camelizeObject(row);
        row.headersCiphertext = row.headersCiphertext.toString();
        row.payloadCiphertext = row.payloadCiphertext.toString();
        row.headersCiphertextHmacSignature = row.headersCiphertextHmacSignature.toString();
        row.payloadCiphertextHmacSignature = row.payloadCiphertextHmacSignature.toString();
        records.push(row);
      });

      callback(null, records);
    });
  });
}

/**!
 * ### getMessageById(messageId, callback)
 * Retrieve message for `messageId`
 *
 * Calls back with message and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {messageId} messageId
 * @param {Function} callback
 */
datastore.getMessageById = function (messageId, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'select * from message where \
        message_id = $1 and \
        deletion_time is null',
       /*jslint multistr: false*/
      values: [
        messageId
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        callback(err);
        return;
      }

      var message = datastore.util.camelizeObject(result.rows[0]);
      message.headersCiphertext = message.headersCiphertext.toString();
      message.payloadCiphertext = message.payloadCiphertext.toString();
      message.headersCiphertextHmacSignature = message.headersCiphertextHmacSignature.toString();
      message.payloadCiphertextHmacSignature = message.payloadCiphertextHmacSignature.toString();

      callback(null, message);
    });
  });
}
