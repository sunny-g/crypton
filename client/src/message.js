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

(function() {

'use strict';

var Message = crypton.Message = function Message (session, raw) {
  this.session = session;
  this.headers = {};
  this.payload = {};

  raw = raw || {};
  for (var i in raw) {
    this[i] = raw[i];
  }
};

Message.prototype.encrypt = function (peer, callback) {

  var headersCiphertext = peer.encryptAndSign(this.headers);
  var payloadCiphertext = peer.encryptAndSign(this.payload);

  if (headersCiphertext.error || payloadCiphertext.error) {
    callback("Error encrypting headers or payload in Message.encrypt()");
    return;
  }
  var that = this;
  this.encrypted = {
    headersCiphertext: JSON.stringify(headersCiphertext),
    payloadCiphertext: JSON.stringify(payloadCiphertext),
    fromUsername: that.session.account.username,
    toAccountId: peer.accountId
  };

  callback && callback(null);
};

Message.prototype.decrypt = function (callback) {
  // var secretKey = this.session.account.secretKey;
  var headersCiphertext = JSON.parse(this.headersCiphertext);
  var payloadCiphertext = JSON.parse(this.payloadCiphertext);

  this.session.getPeer(this.fromUsername, function (err, peer) {
    if (err) {
      callback("Error: cannot getPeer in Message.decrypt()");
      return;
    }

    var headers = this.session.account.verifyAndDecrypt(headersCiphertext, peer);
    var payload = this.session.account.verifyAndDecrypt(payloadCiphertext, peer);
    if (!headers.verified || !payload.verified) {
      callback("Error: cannot verify headers or payload ciphertext in Message.decrypt()");
      return;
    } else if (headers.error || payload.error) {
      callback("Error: cannot decrypt headers or payload in Message.decrypt");
      return;
    }

    try {
      headers = JSON.parse(headers);
      payload = JSON.parse(payload);
    } catch (e) {
      err = 'Error: Could not parse message in Message.decrypt()';
    }

    if (err) {
      callback(err);
      return;
    } else {
      this.headers = headers;
      this.payload = payload;
      this.created = new Date(this.creationTime);
      callback(null, this);
    }
  });
};

Message.prototype.send = function (callback) {
  if (!this.encrypted) {
    return callback('You must encrypt the message to a peer before sending!');
  }

  var url = crypton.url() + '/peer';
  superagent.post(url)
    .send(this.encrypted)
    .withCredentials()
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

    callback(null, res.body.messageId);
  });
};

})();
