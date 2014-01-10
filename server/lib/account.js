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
var bcrypt = require('bcrypt');
var srp = require('srp');

/**!
 * # Account()
 *
 * ````
 * var account = new Account();
 * ````
 */
var Account = module.exports = function Account () {};

/**!
 * ### get(username, callback)
 * Retrieve a user account from the database using the specified `username`
 *
 * Adds data to account object and calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {String} username
 * @param {Function} callback
 */
Account.prototype.get = function (username, callback) {
  app.log('debug', 'getting account for username: ' + username);

  var that = this;

  db.getAccount(username, function (err, account) {
    if (err) {
      callback(err);
      return;
    }

    that.update(account);
    callback(null);
  });
};

/**!
 * ### getById(id, callback)
 * Retrieve a user account from the database using the specified `id`
 *
 * Adds data to account object and calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Number} id
 * @param {Function} callback
 */
Account.prototype.getById = function (id, callback) {
  app.log('debug', 'getting account for id: ' + id);

  var that = this;

  db.getAccountById(id || this.id, function (err, account) {
    if (err) {
      callback(err);
      return;
    }

    that.update(account);
    callback(null);
  });
};

/**!
 * ### beginSrp()
 * Generate SRP B value from stored verifier.
 * Calls back with the server's B value.
 *
 * @param {String} srpA
 * @param {Function} callback
 */
Account.prototype.beginSrp = function(srpA, callback) {
  var that = this;
  srp.genKey(function(err, b) {
    var verifier = new Buffer(that.srpVerifier, 'hex');
    var srpServer = new srp.Server(srp.params[2048], verifier, b);
    srpServer.setA(new Buffer(srpA, 'hex'));
    callback({
      b: b.toString('hex'),
      B: srpServer.computeB().toString('hex'),
      A: srpA
    });
  })
};

/**!
 * ### checkSrp()
 * Finishes SRP verification with client's M1 value.
 *
 * Calls back without error on success.
 * Calls back with an error on failure.
 *
 * @param {String} srpM1
 * @param {Function} callback
 */
Account.prototype.checkSrp = function(srpParams, srpM1, callback) {
  // Revivify srpServer
  var verifier = new Buffer(this.srpVerifier, 'hex');
  var b = new Buffer(srpParams.b, 'hex');
  var srpServer = new srp.Server(srp.params[2048], verifier, b);
  srpServer.setA(new Buffer(srpParams.A, 'hex'));

  try {
    srpServer.checkM1(new Buffer(srpM1, 'hex'));
  } catch(e) {
    callback('SRP verification failed');
    app.log('debug', 'SRP verification error: ' + e.toString());
    return;
  }
  // Don't need this right now. Maybe later?
  //var srpK = srpServer.computeK();
  callback(null);
}

/**!
 * ### update(key, value)
 * Update one or a set of keys in the parent account object
 * 
 * @param {String} key
 * @param {Object} value
 *
 * or
 *
 * @param {Object} input
 */
// TODO add field validation and callback
Account.prototype.update = function () {
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

/**!
 * ### toJSON()
 * Dump non-function values of account object into an object
 * 
 * @return {Object} account
 */
Account.prototype.toJSON = function () {
  var fields = {};

  for (var i in this) {
    if (typeof this[i] != 'function') {
      fields[i] = this[i];
    }
  }

  return fields;
};

/**!
 * ### save(callback)
 * Saves the current state of the account object to the database
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 */
Account.prototype.save = function (callback) {
  app.log('debug', 'saving account');
  db.saveAccount(this.toJSON(), callback);
};

/**!
 * ### sendMessage(from. headers, body, callback)
 * Send a message from current account
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Number} from
 * @param {Object} headers
 * @param {Object} body
 * @param {Function} callback
 */
// TODO consider moving from, headers, body to single argument object
Account.prototype.sendMessage = function (from, headers, body, callback) {
  if (!this.accountId) {
    app.log('warn', 'accountId was not supplied');
    callback('Recipient account object must have accountId');
    return;
  }

  var to = this.accountId;

  app.log('info', 'saving message for account id: ' + to);


  // we should be also make sure there are headers and body arguments
  // and maybe be smart about making one/both of them optional
  // but this works for now

  db.saveMessage({
    fromAccount: from,
    toAccount: to,
    headers: headers,
    body: body
  }, function (err, messageId) {
    if (err) {
      callback('Database error');
      return;
    }

    // there is definitely a better way to get the username to the receipient
    var sender = new Account();
    sender.getById(from, function (err) {
      if (app.clients[to]) {
        app.log('debug', 'sending message over websocket');

        app.clients[to].emit('message', {
          messageId: messageId
        });
      }
    });

    callback(null, messageId);
  });
};

