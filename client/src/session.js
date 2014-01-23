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
 * # Session(id)
 *
 * ````
 * var session = new crypton.Session(id);
 * ````
 *
 * @param {Number} id
 */
var Session = crypton.Session = function (id) {
  this.id = id;
  this.peers = [];
  this.events = [];
  this.containers = [];
  this.inbox = new crypton.Inbox(this);

  var that = this;
  this.socket = io.connect(crypton.url(), {
    secure: true
  });

  this.socket.on('message', function (data) {
    that.inbox.get(data.messageId, function (err, message) {
      that.emit('message', message);
    });
  });
};

/**!
 * ### load(containerName, callback)
 * Retieve container with given platintext `containerName`,
 * either from local cache or server
 *
 * Calls back with container and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerName
 * @param {Function} callback
 */
Session.prototype.load = function (containerName, callback) {
  // check for a locally stored container
  for (var i in this.containers) {
    if (this.containers[i].name == containerName) {
      callback(null, this.containers[i]);
      return;
    }
  }

  // check for a container on the server
  var that = this;
  this.getContainer(containerName, function (err, container) {
    if (err) {
      callback(err);
      return;
    }

    that.containers.push(container);
    callback(null, container);
  });
};

/**!
 * ### loadWithHmac(containerNameHmac, callback)
 * Retieve container with given `containerNameHmac`,
 * either from local cache or server
 *
 * Calls back with container and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerNameHmac
 * @param {Function} callback
 */
Session.prototype.loadWithHmac = function (containerNameHmac, peer, callback) {
  // check for a locally stored container
  for (var i in this.containers) {
    if (this.containers[i].nameHmac == containerNameHmac) {
      callback(null, this.containers[i]);
      return;
    }
  }

  // check for a container on the server
  var that = this;
  this.getContainerWithHmac(containerNameHmac, peer, function (err, container) {
    if (err) {
      callback(err);
      return;
    }

    that.containers.push(container);
    callback(null, container);
  });
};

/**!
 * ### create(containerName, callback)
 * Create container with given platintext `containerName`,
 * save it to server
 *
 * Calls back with container and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerName
 * @param {Function} callback
 */
Session.prototype.create = function (containerName, callback) {
  for (var i in this.containers) {
    if (this.containers[i].name == containerName) {
      callback('Container already exists');
      return;
    }
  }

  var selfPeer = new crypton.Peer({
    session: this,
    pubKey: this.account.pubKey,
    signKeyPub: this.account.signKeyPub
  });

  var sessionKey = crypton.randomBytes(8);
  var hmacKey = crypton.randomBytes(8);
  var sessionKeyCiphertext = selfPeer.encryptAndSign(sessionKey);
  var hmacKeyCiphertext = selfPeer.encryptAndSign(hmacKey);

  if (sessionKeyCiphertext.error) {
    return callback(sessionKeyCiphertext.error);
  }

  if (hmacKeyCiphertext.error) {
    return callback(hmacKeyCiphertext.error);
  }

  delete sessionKeyCiphertext.error;
  delete hmacKeyCiphertext.error;

  var signature = 'hello'; // TODO sign with private key
  var containerNameHmac = new sjcl.misc.hmac(this.account.containerNameHmacKey);
  containerNameHmac = sjcl.codec.hex.fromBits(containerNameHmac.encrypt(containerName));

  // TODO why is a session object generating container payloads? creating the
  // initial container state should be done in container.js
  var payloadCiphertext = sjcl.encrypt(sessionKey, JSON.stringify({
    recordIndex: 0,
    delta: {}
  }), crypton.cipherOptions);

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
        toAccount: that.account.username,
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
    }, function (err) {
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

/**!
 * ### deleteContainer(containerName, callback)
 * Request the server to delete all records and keys
 * belonging to `containerName`
 *
 * Calls back without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerName
 * @param {Function} callback
 */
Session.prototype.deleteContainer = function (containerName, callback) {
  var that = this;
  var containerNameHmac = new sjcl.misc.hmac(this.account.containerNameHmacKey);
  containerNameHmac = sjcl.codec.hex.fromBits(containerNameHmac.encrypt(containerName));

  new crypton.Transaction(this, function (err, tx) {
    var chunk = {
      type: 'deleteContainer',
      containerNameHmac: containerNameHmac
    };

    tx.save(chunk, function (err) {
      if (err) {
        return callback(err);
      }

      tx.commit(function (err) {
        callback(err);
      });
    });
  });
};


/**!
 * ### getContainer(containerName, callback)
 * Retrieve container with given platintext `containerName`
 * specifically from the server
 *
 * Calls back with container and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerName
 * @param {Function} callback
 */
Session.prototype.getContainer = function (containerName, callback) {
  var container = new crypton.Container(this);
  container.name = containerName;
  container.sync(function (err) {
    callback(err, container);
  });
};

/**!
 * ### getContainerWithHmac(containerNameHmac, callback)
 * Retrieve container with given `containerNameHmac`
 * specifically from the server
 *
 * Calls back with container and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} containerNameHmac
 * @param {Function} callback
 */
Session.prototype.getContainerWithHmac = function (containerNameHmac, peer, callback) {
  var container = new crypton.Container(this);
  container.nameHmac = containerNameHmac;
  container.peer = peer;
  container.sync(function (err) {
    callback(err, container);
  });
};

/**!
 * ### getPeer(containerName, callback)
 * Retrieve a peer object from the database for given `username`
 *
 * Calls back with peer and without error if successful
 *
 * Calls back with error if unsuccessful
 *
 * @param {String} username
 * @param {Function} callback
 */
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

/**!
 * ### on(eventName, listener)
 * Set `listener` to be called anytime `eventName` is emitted
 *
 * @param {String} eventName
 * @param {Function} listener
 */
// TODO allow multiple listeners
Session.prototype.on = function (eventName, listener) {
  this.events[eventName] = listener;
};

/**!
 * ### emit(eventName, data)
 * Call listener for `eventName`, passing it `data` as an argument
 *
 * @param {String} eventName
 * @param {Object} data
 */
// TODO allow multiple listeners
Session.prototype.emit = function (eventName, data) {
  this.events[eventName] && this.events[eventName](data);
};

})();

