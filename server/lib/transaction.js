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

var app = require('../app');
var db = app.datastore;

var Transaction = module.exports = function Transaction () {};

Transaction.prototype.create = function (accountId, callback) {
  var that = this;
  this.update('accountId', accountId);

  db.createTransaction(accountId, function (err, id) {
    if (err) {
      callback(err);
      return;
    }

    that.update('transactionId', id);
    callback(null);
  });
};

Transaction.prototype.get = function (id, callback) {
  var that = this;

  db.getTransaction(id, function (err, transaction) {
    if (err) {
      callback(err);
      return;
    }

    if (!transaction.transactionId) {
      callback('Transaction does not exist');
      return;
    }

    that.update(transaction);
    callback(null);
  });
};

// TODO add field validation and callback
Transaction.prototype.update = function () {
  // update({ key: 'value' });
  if (typeof arguments[0] == 'object') {
    for (var key in arguments[0]) {
      this[key] = arguments[0][key];
    }
  }

  // update('key', 'value')
  else if (typeof arguments[0] == 'string' && typeof arguments[1] != 'undefined') {
    this[arguments[0]] = arguments[1];
  }
};

Transaction.prototype.add = function (data, callback) {
  var that = this;
  this.assertOwnership(callback, function () {
    db.updateTransaction(that, data, function (err) {
      callback(err && 'Invalid chunk data');
    });
  });
};

Transaction.prototype.abort = function (callback) {
  var that = this;
  this.assertOwnership(callback, function () {
    db.abortTransaction(that.transactionId, callback);
  });
};

Transaction.prototype.commit = function (callback) {
  var that = this;
  this.assertOwnership(callback, function () {
    db.requestTransactionCommit(that.transactionId, that.accountId, callback);
  });
};

Transaction.prototype.assertOwnership = function (callback, next) {
  if (this.interactingAccount != this.accountId) {
    callback('Transaction does not belong to account');
  } else {
    next();
  }
};
