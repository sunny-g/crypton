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
var bcrypt = require('bcrypt');

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
 * ### hashChallengeKey(challengeKey, callback)
 * Hash an encoded version of the supplied `challengeKey` and store it in the parent account object
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {String} challengeKey
 * @param {Function} callback
 */
Account.prototype.hashChallengeKey = function (challengeKey, callback) {
  app.log('debug', 'hashing challenge key');

  if (!challengeKey) {
    app.log('warn', 'challenge key not supplied to hashChallengeKey');
    callback('Must supply challengeKey');
    return;
  }

  var that = this;
  var rounds = 12; // TODO make this configurable
  var challengeKeyEncoded = new Buffer(challengeKey).toString('hex');

  app.log('trace', 'generating bcrypt salt');

  bcrypt.genSalt(rounds, function (err, salt) {
    if (err) {
      app.log('warn', err);
      callback(err);
      return;
    }

    app.log('trace', 'hashing encoded challenge key with generated salt');

    bcrypt.hash(challengeKeyEncoded, salt, function (err, hash) {
      if (err) {
        app.log('warn', err);
        callback(err);
        return;
      }

      that.challengeKeyHash = hash;
      callback(null);
    });
  });
};

/**!
 * ### verifyChallenge(challengeKeyReponse, callback)
 * Compare `challengeKeyResponse` with stored `challengeKeyHash`
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {String} challengeKeyResponse
 * @param {Function} callback
 */
Account.prototype.verifyChallenge = function (challengeKeyResponse, callback) {
  app.log('debug', 'verifying challenge');

  var challengeKeyResponseEncoded = new Buffer(challengeKeyResponse).toString('hex');

  app.log('trace', 'comparing encoded challengeKeyResponse with challengeKeyHash');

  bcrypt.compare(challengeKeyResponseEncoded, this.challengeKeyHash, function (err, success) {
    if (err || !success) {
      callback('Incorrect password');
      return;
    }

    callback(null);
  });
};

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
          from: {
            id: from,
            username: sender.username
          },
          headers: headers,
          body: body
        });
      }
    });

    callback(null, messageId);
  });
};

