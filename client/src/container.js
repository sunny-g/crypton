/* Crypton Client, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Crypton Client is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Client is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Client.  If not, see <http://www.gnu.org/licenses/>.
*/

(function () {

'use strict';

/**!
 * # Container(session)
 *
 * ````
 * var container = new crypton.Container(session);
 * ````
 *
 * @param {Object} session
 */
var Container = crypton.Container = function (session) {
  this.keys = {};
  this.session = session;
  this.versions = {};
  this.version = +new Date();
  this.name = null;
};

/**!
 * ### add(key, callback)
 * Add given `key` to the container
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {String} key
 * @param {Function} callback
 */
Container.prototype.add = function (key, callback) {
  if (this.keys[key]) {
    callback('Key already exists');
    return;
  }

  this.keys[key] = {};
  callback();
};

/**!
 * ### get(key, callback)
 * Retrieve value for given `key`
 *
 * Calls back with `value` and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {String} key
 * @param {Function} callback
 */
Container.prototype.get = function (key, callback) {
  if (!this.keys[key]) {
    callback('Key does not exist');
    return;
  }

  callback(null, this.keys[key]);
};

/**!
 * ### save(callback, options)
 * Get difference of container since last save (a record),
 * encrypt the record, and send it to the server to be saved
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 * @param {Object} options (optional)
 */
Container.prototype.save = function (callback, options) {
  var that = this;
  this.getDiff(function (err, diff) {
    if (!diff) {
      callback('Container has not changed');
      return;
    }

    var now = +new Date();
    that.versions[now] = JSON.parse(JSON.stringify(that.keys));
    that.version = now;

    var payloadCiphertext = sjcl.encrypt(that.hmacKey, JSON.stringify(diff), crypton.cipherOptions);

    var chunk = {
      type: 'addContainerRecord',
      containerNameHmac: that.getPublicName(),
      payloadCiphertext: payloadCiphertext
    };

    if (options && options.save == false) {
      callback(null, chunk);
      return;
    }

    // TODO handle errs
    var tx = new crypton.Transaction(that.session, function (err) {
      tx.save(chunk, function (err) {
        tx.commit(function (err) {
          callback();
        });
      });
    });
  });
};

/**!
 * ### getDiff(callback, options)
 * Compute difference of container since last save
 *
 * Calls back with diff object and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 */
Container.prototype.getDiff = function (callback) {
  var last = this.latestVersion();
  var old = this.versions[last] || {};
  callback(null, crypton.diff.create(old, this.keys));
};

/**!
 * ### getVersions()
 * Return a list of known save point timestamps
 *
 * @return {Array} timestamps
 */
Container.prototype.getVersions = function () {
  return Object.keys(this.versions);
};

/**!
 * ### getVersion(version)
 * Return full state of container at given `timestamp`
 *
 * @param {Number} timestamp
 * @return {Object} version
 */
Container.prototype.getVersion = function (timestamp) {
  return this.versions[timestamp];
};

/**!
 * ### getVersion()
 * Return last known save point timestamp
 *
 * @return {Number} version
 */
Container.prototype.latestVersion = function () {
  var versions = this.getVersions();

  if (!versions.length) {
    return this.version;
  } else {
    return Math.max.apply(Math, versions);
  }
};

/**!
 * ### getPublicName()
 * Compute the HMAC for the given name of the container
 *
 * @return {String} hmac
 */
Container.prototype.getPublicName = function () {
  var hmac = new sjcl.misc.hmac(this.session.account.containerNameHmacKey);
  var containerNameHmac = hmac.encrypt(this.name);
  return sjcl.codec.hex.fromBits(containerNameHmac);
};

/**!
 * ### getHistory()
 * Ask the server for all state records
 *
 * Calls back with diff object and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 */
Container.prototype.getHistory = function (callback) {
  var containerNameHmac = this.getPublicName();

  superagent.get(crypton.url() + '/container/' + containerNameHmac)
    .set('session-identifier', this.session.id)
    .end(function (res) {
      if (!res.body || res.body.success !== true) {
        callback(res.body.error);
        return;
      }

      callback(null, res.body.records);
    });
};

/**!
 * ### parseHistory(records, callback)
 * Loop through given `records`, decrypt them,
 * and build object state from decrypted diff objects
 *
 * Calls back with full container state, history versions,
 * and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Array} records
 * @param {Function} callback
 */
Container.prototype.parseHistory = function (records, callback) {
  var keys = {};
  var versions = {};

  for (var i in records) {
    var record = this.decryptRecord(records[i]);
    keys = crypton.diff.apply(record.delta, keys);
    versions[record.time] = JSON.parse(JSON.stringify(keys));
  }

  callback(null, keys, versions);
};

/**!
 * ### decryptRecord(record)
 * Use symkey to extract session and HMAC keys,
 * decrypt record ciphertext with HMAC key
 * 
 * @param {Object} record
 * @record {Object} decryptedRecord
 */
// TODO consider new scheme for extracting keys
// TODO handle potential JSON.parse errors here
Container.prototype.decryptRecord = function (record) {
  var sessionKey = JSON.parse(sjcl.decrypt(this.session.account.symkey, record.sessionKeyCiphertext, crypton.cipherOptions));

  var hmacKey = JSON.parse(sjcl.decrypt(this.session.account.symkey, record.hmacKeyCiphertext, crypton.cipherOptions));

  this.sessionKey = sessionKey;
  this.hmacKey = hmacKey;

  var payload = JSON.parse(sjcl.decrypt(hmacKey, record.payloadCiphertext, crypton.cipherOptions));

  return {
    time: +new Date(record.creationTime),
    delta: payload
  };
};

/**!
 * ### sync(callback)
 * Retrieve history, decrypt it, and update
 * container object with new state
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 */
Container.prototype.sync = function (callback) {
  var that = this;
  this.getHistory(function (err, records) {
    if (err) {
      callback(err);
      return;
    }

    that.parseHistory(records, function (err, keys, versions) {
      that.keys = keys;
      that.versions = versions;
      that.version = Math.max.apply(Math, Object.keys(versions));
      callback(err);
    });
  });
};

})();

