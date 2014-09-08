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

  // watch for incoming Inbox messages
  this.socket.on('message', function (data) {
    that.inbox.get(data.messageId, function (err, message) {
      that.emit('message', message);
    });
  });

  // watch for container update notifications
  this.socket.on('containerUpdate', function (containerNameHmac) {
    // if any of the cached containers match the HMAC
    // in the notification, sync the container and
    // call the listener if one has been set
    for (var i in that.containers) {
      var container = that.containers[i];
      var temporaryHmac = container.containerNameHmac || container.getPublicName();

      if (crypton.constEqual(temporaryHmac, containerNameHmac)) {
        container.sync(function (err) {
          if (container._listener) {
            container._listener();
          }
        });

        break;
      }
    }
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
    if (crypton.constEqual(this.containers[i].name, containerName)) {
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
    if (crypton.constEqual(this.containers[i].nameHmac, containerNameHmac)) {
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
    if (crypton.constEqual(this.containers[i].name, containerName)) {
      callback('Container already exists');
      return;
    }
  }

  var selfPeer = new crypton.Peer({
    session: this,
    pubKey: this.account.pubKey,
    signKeyPub: this.account.signKeyPub
  });
  selfPeer.trusted = true;

  var sessionKey = crypton.randomBytes(32);
  var sessionKeyCiphertext = selfPeer.encryptAndSign(sessionKey);

  if (sessionKeyCiphertext.error) {
    return callback(sessionKeyCiphertext.error);
  }

  delete sessionKeyCiphertext.error;

  // TODO is signing the sessionKey even necessary if we're
  // signing the sessionKeyShare? what could the container
  // creator attack by wrapping a different sessionKey?
  var signature = 'hello';
  var containerNameHmac = new sjcl.misc.hmac(this.account.containerNameHmacKey);
  containerNameHmac = sjcl.codec.hex.fromBits(containerNameHmac.encrypt(containerName));

  // TODO why is a session object generating container payloads? creating the
  // initial container state should be done in container.js
  var rawPayloadCiphertext = sjcl.encrypt(sessionKey, JSON.stringify({
    recordIndex: 0,
    delta: {}
  }), crypton.cipherOptions);

  var payloadCiphertextHash = sjcl.hash.sha256.hash(JSON.stringify(rawPayloadCiphertext));
  var payloadSignature = this.account.signKeyPrivate.sign(payloadCiphertextHash, crypton.paranoia);

  var payloadCiphertext = {
    ciphertext: rawPayloadCiphertext,
    signature: payloadSignature
  };

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
      }, {
        type: 'addContainerRecord',
        containerNameHmac: containerNameHmac,
        payloadCiphertext: payloadCiphertext
      }
    ];

    async.eachSeries(chunks, function (chunk, callback2) {
      tx.save(chunk, callback2);
    }, function (err) {
      if (err) {
        return tx.abort(function () {
          callback(err);
        });
      }

      tx.commit(function () {
        var container = new crypton.Container(that);
        container.name = containerName;
        container.sessionKey = sessionKey;
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
        if (err) {
          //then call our callback
          return callback(err);
        }

        //delete it from the list of containers
        var i;
        for (i = 0; i < that.containers.length; i++) {
          if (crypton.constEqual(that.containers[i].name, containerName)) {
            that.containers.splice(i, 1);
            break;
          }
        }

        callback(null);
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
    return callback(null, this.peers[username]);
  }

  var that = this;
  var peer = new crypton.Peer();
  peer.username = username;
  peer.session = this;

  peer.fetch(function (err, peer) {
    if (err) {
      return callback(err);
    }

    that.load(crypton.trustStateContainer, function (err, container) {
      if (err) {
        return callback(err);
      }

      // if the peer has previously been trusted,
      // we should check the saved fingerprint against
      // what the server has given us
      if (!container.keys[username]) {
        peer.trusted = false;
      } else {
        var savedFingerprint = container.keys[username].fingerprint;

        if (!crypton.constEqual(savedFingerprint, peer.fingerprint)) {
          return callback('Server has provided malformed peer', peer);
        }

        peer.trusted = true;
      }

      that.peers[username] = peer;
      callback(null, peer);
    });
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

