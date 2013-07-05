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

var datastore = require('./');
var connect = datastore.connect;

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
        records.push(row);
      });

      callback(null, records);
    });
  });
}
