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

var app = process.app;
var datastore = require('./');
var connect = datastore.connect;
var fs = require('fs');
var transactionQuery = fs.readFileSync(__dirname + '/sql/transaction.sql').toString();

/**!
 * ### createTransaction(accountId, callback)
 * Retrieve all records for given `containerNameHmac`
 *
 * Calls back with transaction id and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Number} accountId
 * @param {Function} callback
 */
datastore.createTransaction = function (accountId, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'insert into transaction ("account_id") \
        values ($1) returning transaction_id',
      /*jslint multistr: false*/
      values: [ accountId ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);
        callback('Database error');
        return;
      }

      callback(null, result.rows[0].transaction_id);
    });
  });
};

/**!
 * ### getTransaction(transactionId, callback)
 * Retrieve transaction ros for given `transactionId`
 *
 * Calls back with transaction data and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Number} transactionId
 * @param {Function} callback
 */
datastore.getTransaction = function (transactionId, callback) {
  connect(function (client, done) {
    var query = {
      text: 'select * from transaction where transaction_id = $1',
      values: [
        transactionId
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);
        callback('Database error');
        return;
      }

      var row = datastore.util.camelizeObject(result.rows[0]);
      callback(null, row);
    });
  });
};

/**!
 * ### abortTransaction(transactionId, callback)
 * Mark transaction aborted for given `transactionId`
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Number} transactionId
 * @param {Function} callback
 */
datastore.abortTransaction = function (transactionId, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'update transaction \
          set abort_timestamp = current_timestamp \
          where transaction_id=$1;',
      /*jslint multistr: false*/
      values: [
        transactionId
      ]
    };

    client.query(query, function (err, results) {
      done();
      callback(err, results);
      // TODO why pass results back?
    });
  });
};

/**!
 * ### updateTransaction(transaction, data, callback)
 * Pass `data` off to specific chunk handler to be added to given `transaction`
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} transaction
 * @param {Object} data
 * @param {Function} callback
 */
// TODO consider reversing data and transaction arguments
// to match the transaction chunk handler methods
datastore.updateTransaction = function (transaction, data, callback) {
  var types = Object.keys(datastore.transaction);
  var type = data.type;
  var valid = ~types.indexOf(type);

  if (!valid) {
    callback('Invalid transaction type');
    return;
  }

  datastore.transaction[type](data, transaction, callback);
};

/**!
 * ### requestTransactionCommit(transactionId, accountId, callback)
 * Pass transaction to commit requester after validation is successful
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Number} transactionId
 * @param {Number} accountId
 * @param {Function} callback
 */
datastore.requestTransactionCommit = function (transactionId, accountId, callback) {
  connect(function (client, done) {
    datastore.getTransaction(transactionId, function (err, transaction) {
      done();

      if (!transaction.transactionId) {
        callback('Transaction does not exist');
        return;
      }

      if (accountId != transaction.accountId) {
        callback('Transaction does not belong to account');
        return;
      }

      commit.request(transaction.transactionId, callback);
    });
  });
};

datastore.transaction = {};

/**!
 * ### transaction.addContainer(data, transaction, callback)
 * Add addContainer chunk to given `transaction`
 * via transaction_add_container table
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} data
 * @param {Object} transaction
 * @param {Function} callback
 */
datastore.transaction.addContainer = function (data, transaction, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'insert into transaction_add_container \
        (transaction_id, name_hmac) values ($1, $2)',
      /*jslint multistr: false*/
      values: [
        transaction.transactionId,
        data.containerNameHmac
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);

        if (~err.message.indexOf('violates unique constraint')) {
          callback('Container already exists');
          return;
        }

        callback('Invalid chunk data');
        return;
      }

      callback();
    });
  });
};

/**!
 * ### transaction.addContainerSessionKey(data, transaction, callback)
 * Add addContainerSessionKey chunk to given `transaction`
 * via transaction_add_container_session_key table
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} data
 * @param {Object} transaction
 * @param {Function} callback
 */
datastore.transaction.addContainerSessionKey = function (data, transaction, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'insert into transaction_add_container_session_key \
        (transaction_id, name_hmac, signature) values ($1, $2, $3)',
      /*jslint multistr: false*/
      values: [
        transaction.transactionId,
        data.containerNameHmac,
        data.signature
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);
        callback('Invalid chunk data');
        return;
      }

      callback();
    });
  });
};

/**!
 * ### transaction.addContainerSessionKeyShare(data, transaction, callback)
 * Add addContainerSessionKeyShare chunk to given `transaction`
 * via transaction_add_container_session_key_share table
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} data
 * @param {Object} transaction
 * @param {Function} callback
 */
datastore.transaction.addContainerSessionKeyShare = function (data, transaction, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: 'insert into transaction_add_container_session_key_share \
        (transaction_id, name_hmac, to_account_id, session_key_ciphertext, hmac_key_ciphertext) \
        values ($1, $2, $3, $4, $5)',
      /*jslint multistr: false*/
      values: [
        transaction.transactionId,
        data.containerNameHmac,
        transaction.accountId,
        data.sessionKeyCiphertext,
        data.hmacKeyCiphertext
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);
        callback('Invalid chunk data');
        return;
      }

      callback();
    });
  });
};

/**!
 * ### transaction.addContainerRecord(data, transaction, callback)
 * Add addContainerRecord chunk to given `transaction`
 * via transaction_add_container_record table
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Object} data
 * @param {Object} transaction
 * @param {Function} callback
 */
datastore.transaction.addContainerRecord = function (data, transaction, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: "\
        insert into transaction_add_container_record \
        (transaction_id, name_hmac, latest_record_id, \
        /*hmac, payload_iv, */payload_ciphertext) \
        values ($1, $2, $3, $4)", // decode($4, 'hex'), \
        //decode($5, 'hex'), decode($6, 'hex'))",
      /*jslint multistr: false*/
      values: [
        transaction.transactionId,
        data.containerNameHmac,
        data.latestRecordId,
        //data.hmac,
        //data.payloadIv,
        data.payloadCiphertext
      ]
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('warn', err);
        callback('Invalid chunk data');
        return;
      }

      callback();
    });
  });
};

var commit = {};

/**!
 * ### commit.request(transactionId, callback)
 * Mark commit_request_time for given `transactionId`
 * so commit troller will pick it up
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {Number} transactionId
 * @param {Function} callback
 */
commit.request = function (transactionId, callback) {
  connect(function (client, done) {
    var query = {
      /*jslint multistr: true*/
      text: '\
        update transaction \
          set commit_request_time = current_timestamp \
          where transaction_id=$1;',
      /*jslint multistr: false*/
      values: [
        transactionId
      ]
    };

    client.query(query, function (err, results) {
      done();
      callback(err, results);
      // TODO why are we passing back results?
    });
  });
};

/**!
 * ### commit.troll()
 * Searches for transactions with commit requested but not started
 * and passes them to commit.finish()
 */
commit.troll = function () {
  connect(function (client, done) {
    /*jslint multistr: true*/
    var query = '\
      select * from transaction \
      where commit_request_time is not null \
      and commit_start_time is null \
      order by commit_request_time asc, \
      transaction_id asc';
      /*jslint multistr: false*/

    client.query(query, function (err, result) {
      done();

      if (err) {
        app.log('fatal', err);
        process.exit(1);
        return;
      }

      if (result.rows.length) {
        app.log(result.rows.length + ' transactions to commit');
        // TODO queue
        for (var i in result.rows) {
          commit.finish(result.rows[i].transaction_id);
        }
      }
    });
  });
};

/**!
 * Search for commits every tenth of a second
 */
// TODO should we make this configurable?
setInterval(commit.troll, 100);

/**!
 * ### commit.finish(transactionId)
 * Execute transaction SQL for given `transactionId`
 */
commit.finish = function (transactionId) {
  connect(function (client, done) {
    // TODO use hostname of node
    var tq = transactionQuery
      .replace(/\{\{hostname\}\}/gi, 'hostname')
      .replace(/\{\{transactionId\}\}/gi, transactionId);

    client.query(tq, function (err, result) {
      if (err) {
        client.query('rollback');
        app.log('warn', err);
      }

      done();
    });
  });
};
