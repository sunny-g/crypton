/* Crypton Client, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. 
 *
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
    callback('Error encrypting headers or payload in Message.encrypt()');
    return;
  }

  this.encrypted = {
    headersCiphertext: JSON.stringify(headersCiphertext),
    payloadCiphertext: JSON.stringify(payloadCiphertext),
    fromUsername: this.session.account.username,
    toAccountId: peer.accountId
  };

  callback && callback(null);
};

Message.prototype.decrypt = function (callback) {
  var that = this;
  var headersCiphertext = JSON.parse(this.headersCiphertext);
  var payloadCiphertext = JSON.parse(this.payloadCiphertext);

  this.session.getPeer(this.fromUsername, function (err, peer) {
    if (err) {
      callback(err);
      return;
    }

    var headers = that.session.account.verifyAndDecrypt(headersCiphertext, peer);
    var payload = that.session.account.verifyAndDecrypt(payloadCiphertext, peer);
    if (!headers.verified || !payload.verified) {
      callback('Cannot verify headers or payload ciphertext in Message.decrypt()');
      return;
    } else if (headers.error || payload.error) {
      callback('Cannot decrypt headers or payload in Message.decrypt');
      return;
    }

    that.headers = JSON.parse(headers.plaintext);
    that.payload = JSON.parse(payload.plaintext);
    that.created = new Date(that.creationTime);
    callback(null, that);
  });
};

Message.prototype.send = function (callback) {
  if (!this.encrypted) {
    return callback('You must encrypt the message to a peer before sending!');
  }

  var url = crypton.url() + '/peer?sid=' + crypton.sessionId;
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
