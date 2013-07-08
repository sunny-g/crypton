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

var Account = module.exports = function Account () {};

Account.prototype.get = function (username, callback) {
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

Account.prototype.getById = function (id, callback) {
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

Account.prototype.hashChallengeKey = function (callback) {
  if (!this.challengeKey) {
    callback('Must supply challengeKey');
    return;
  }

  var that = this;
  var rounds = 12; // TODO make this configurable
  var challengeKeyEncoded = new Buffer(this.challengeKey).toString('hex');

  bcrypt.genSalt(rounds, function (err, salt) {
    if (err) {
      callback(err);
      return;
    }

    bcrypt.hash(challengeKeyEncoded, salt, function (err, hash) {
      if (err) {
        callback(err);
        return;
      }

      that.challengeKeyHash = hash;
      delete that.challengeKey;
      callback(null);
    });
  });
};

Account.prototype.verifyChallenge = function (challengeKeyResponse, callback) {
  var challengeKeyResponseEncoded = new Buffer(challengeKeyResponse).toString('hex');

  bcrypt.compare(challengeKeyResponseEncoded, this.challengeKeyHash, function (err, success) {
    if (err || !success) {
      callback('Incorrect password');
      return;
    }

    callback(null);
  });
};

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

Account.prototype.toJSON = function () {
  var fields = {};

  for (var i in this) {
    if (typeof this[i] != 'function') {
      fields[i] = this[i];
    }
  }

  return fields;
};

Account.prototype.save = function (callback) {
  db.saveAccount(this.toJSON(), callback);
};

Account.prototype.sendMessage = function (from, headers, body, callback) {
  if (!this.accountId) {
    callback('Recipient account object must have accountId');
    return;
  }

  var to = this.accountId;

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

