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
  var Session = crypton.Session = function (id) {
    this.id = id;
    this.peers = [];
    this.containers = [];
  };

  Session.prototype.serialize = function (callback) {
  };

  Session.prototype.ping = function (callback) {
  };

  Session.prototype.load = function (containerName, callback) {
    // check for a locally stored container
    for (var i in this.containers) {
      if (this.containers[i].name == containerName) {
        callback(null, this.containers[i]);
        return;
      }
    }

    // check for a container on the server
    this.getContainer(containerName, function (err, container) {
      if (err) {
        callback(err);
        return;
      }

      this.containers.push(container);
      callback(null, container);
    }.bind(this));
  };

  Session.prototype.create = function (containerName, callback) {
    for (var i in this.containers) {
      if (this.containers[i].name == containerName) {
        callback('Container already exists');
        return;
      }
    }

    var sessionKey = crypton.randomBytes(8);
    var hmacKey = crypton.randomBytes(8);
    var sessionKeyCiphertext = sjcl.encrypt(this.account.symkey, JSON.stringify(sessionKey), crypton.cipherOptions);
    var hmacKeyCiphertext = sjcl.encrypt(this.account.symkey, JSON.stringify(hmacKey), crypton.cipherOptions);

    var keyshmac = new sjcl.misc.hmac(crypton.randomBytes(8));
    keyshmac = sjcl.codec.hex.fromBits(keyshmac.encrypt(JSON.stringify(sessionKey) + JSON.stringify(hmacKey)));

    var signature = 'hello'; // TODO sign with private key
    var containerNameHmac = new sjcl.misc.hmac(this.account.containerNameHmacKey);
    containerNameHmac = sjcl.codec.hex.fromBits(containerNameHmac.encrypt(containerName));
    var payloadCiphertext = sjcl.encrypt(hmacKey, JSON.stringify({}), crypton.cipherOptions);

    var that = this;
    new crypton.Transaction(this, function (err, tx) {
      var chunks = [
        {
          type: 'addContainer',
          containerNameHmac: containerNameHmac
        }, {
          type: 'addContainerSessionKey',
          containerNameHmac: containerNameHmac,
          signature: signature
        }, {
          type: 'addContainerSessionKeyShare',
          containerNameHmac: containerNameHmac,
          sessionKeyCiphertext: sessionKeyCiphertext,
          hmacKeyCiphertext: hmacKeyCiphertext
        }, {
          type: 'addContainerRecord',
          containerNameHmac: containerNameHmac,
          payloadCiphertext: payloadCiphertext
        }
      ];

      async.each(chunks, function (chunk, callback) {
        tx.save(chunk, callback);
      }.bind(this), function (err) {
        // TODO handle err
        if (err) {
          console.log(err);
          return;
        }

        tx.commit(function () {
          var container = new crypton.Container(that);
          container.name = containerName;
          container.sessionKey = sessionKey;
          container.hmacKey = hmacKey;
          that.containers.push(container);
          callback(null, container);
        });
      });
    });
  };

  Session.prototype.getContainer = function (containerName, callback) {
    var container = new crypton.Container(this);
    container.name = containerName;
    container.sync(function (err) {
      callback(err, container);
    });
  };

  Session.prototype.getPeer = function (username, callback) {
    if (this.peers[username]) {
      callback(null, this.peers[username]);
      return;
    }

    var that = this;
    var peer = new crypton.Peer();
    peer.username = username;
    peer.session = this;

    peer.fetch(function (err, peer) {
      if (err) {
        callback(err);
        return;
      }

      that.peers[username] = peer;
      callback(err, peer);
    });
  };
})();

