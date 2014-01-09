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
  var messageKey = crypton.randomBytes(8);
  var hMessageKey = sjcl.hash.sha256.hash(messageKey);

  var headerCiphertext = sjcl.encrypt(hMessageKey, JSON.stringify(this.headers), crypton.cipherOptions);
  var payloadCiphertext = sjcl.encrypt(hMessageKey, JSON.stringify(this.payload), crypton.cipherOptions);

  var keyCiphertext = sjcl.encrypt(peer.pubKey, messageKey, crypton.cipherOptions);
  var hmac = new sjcl.misc.hmac(hMessageKey);
  var keySignature = hmac.encrypt(keyCiphertext);

  this.encrypted = {
    headerCiphertext: JSON.stringify(headerCiphertext),
    payloadCiphertext: JSON.stringify(payloadCiphertext),
    keyCiphertext: JSON.stringify(keyCiphertext),
    keyCiphertextHmacSignature: sjcl.codec.hex.fromBits(keySignature),
    toAccountId: peer.accountId
  };

  callback && callback(null);
};

Message.prototype.decrypt = function (callback) {
  // messageKey = decrypt(private, keyCiphertext)
  // generate keySignature
  // verify keySignature
  // decrypt headers with messageKey
  // decrypt payload with messageKey
console.log(this);
return;

  var secretKey = this.session.account.secretKey;

  var headers = sjcl.decrypt(secretKey, this.headerCiphertext, crypton.cipherOptions);
  var payload = sjcl.decrypt(secretKey, this.payloadCiphertext, crypton.cipherOptions);

  var err;
  try {
    headers = JSON.parse(headers);
    payload = JSON.parse(payload);
  } catch (e) {
    err = 'Could not parse message';
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
};

Message.prototype.send = function (callback) {
  if (!this.encrypted) {
console.log('!encrypted');
    return callback('You must encrypt the message to a peer before sending!');
  }

console.log('sending');
  var url = crypton.url() + '/peer';
  superagent.post(url)
    .send(this.encrypted)
    .set('x-session-identifier', this.session.id)
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

console.log(res.body);
    callback(null, res.body.messageId);
  });
};

})();
