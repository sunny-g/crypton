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

var app = process.app;
var db = app.datastore;
var bcrypt = require('bcrypt');

var Account = module.exports = function Account () {};

Account.prototype.get = function (username, callback) {
  var that = this;

  db.getAccount(req.params.username, function (err, account) {
    if (err) {
      callback(err);
      return;
    }

    that.update(account);
    callback(null);
  });
};

Account.prototype.generateChallenge = function (callback) {
  var that = this;
  var challengeKeyDigest = new Buffer(this.challengeKey).toString('hex');

  bcrypt.genSalt(12, function (err, salt) {
    if (err) {
      callback(err);
      return;
    }

    bcrypt.hash(challengeKeyDigest, salt, function (err, hash) {
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

Account.prototype.verifyChallenge = function (challengeKey, callback) {
  var challengeKeyDigest = new Buffer(JSON.stringify(challengeKey)).toString('hex');

  bcrypt.compare(challengeKeyDigest, this.challengeKeyHash, function (err, success) {
    if (err || !success) {
      callback('Incorrect password');
      return;
    }

    callback(null);
  });
};

// TODO add validation and callback
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

Account.prototype.serialize = function () {
  var fields = {};

  for (var i in this) {
    if (typeof this[i] != 'function') {
      fields[i] = this[i];
    }
  }

  return fields;
};

Account.prototype.save = function (callback) {
  db.saveAccount(this.serialize(), callback);
};
