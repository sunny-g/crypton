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
  var Container = crypton.Container = function (session) {
    this.keys = {};
    this.session = session;
    this.versions = {};
    this.version = +new Date();
    this.name = null;
  };

  Container.prototype.add = function (key, callback) {
    if (this.keys[key]) {
      callback('Key already exists');
      return;
    }

    this.keys[key] = {};
    callback();
  };

  Container.prototype.get = function (key, callback) {
    if (!this.keys[key]) {
      callback('Key does not exist');
      return;
    }

    callback(null, this.keys[key]);
  };

  Container.prototype.save = function (callback, options) {
    this.getDiff(function (err, diff) {
      var now = +new Date();
      this.versions[now] = JSON.parse(JSON.stringify(this.keys));
      this.version = now;

      // don't do anything if the container hasn't changed
      if (!diff) {
        callback();
        return;
      }

      var payloadCiphertext = sjcl.encrypt(this.hmacKey, JSON.stringify(diff), crypton.cipherOptions);

      var chunk = {
        type: 'addContainerRecord',
        containerNameHmac: this.getPublicName(),
        payloadCiphertext: payloadCiphertext
      };

      if (options && options.save == false) {
        callback(null, chunk);
        return;
      }

      // TODO handle errs
      var tx = new crypton.Transaction(this.session, function (err) {
        tx.save(chunk, function (err) {
          tx.commit(function (err) {
            callback();
          });
        });
      });
    }.bind(this));
  };

  Container.prototype.getDiff = function (callback) {
    var last = this.latestVersion();
    var old = this.versions[last] || {};
    callback(null, crypton.diff.create(old, this.keys));
  };

  Container.prototype.getVersions = function () {
    return Object.keys(this.versions);
  };

  Container.prototype.getVersion = function (version) {
    return this.versions[version];
  };

  Container.prototype.latestVersion = function () {
    var versions = this.getVersions();

    if (!versions.length) {
      return this.version;
    } else {
      return Math.max.apply(Math, versions);
    }
  };

  Container.prototype.getPublicName = function () {
    var hmac = new sjcl.misc.hmac(this.session.account.containerNameHmacKey);
    var containerNameHmac = hmac.encrypt(this.name);
    return sjcl.codec.hex.fromBits(containerNameHmac);
  };

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

