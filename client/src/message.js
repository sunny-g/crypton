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
  var headersCiphertext = sjcl.encrypt(peer.pubKey, JSON.stringify(this.headers), crypton.cipherOptions);
  var payloadCiphertext = sjcl.encrypt(peer.pubKey, JSON.stringify(this.payload), crypton.cipherOptions);

  var headersHmac = new sjcl.misc.hmac('');
  var headersSignature = headersHmac.encrypt(headersCiphertext);

  var payloadHmac = new sjcl.misc.hmac('');
  var payloadSignature = payloadHmac.encrypt(payloadCiphertext);

  this.encrypted = {
    headersCiphertext: JSON.stringify(headersCiphertext),
    payloadCiphertext: JSON.stringify(payloadCiphertext),
    headersCiphertextHmacSignature: sjcl.codec.hex.fromBits(headersSignature),
    payloadCiphertextHmacSignature: sjcl.codec.hex.fromBits(payloadSignature),
    toAccountId: peer.accountId
  };

  callback && callback(null);
};

Message.prototype.decrypt = function (callback) {
  var secretKey = this.session.account.secretKey;
  var headersCiphertext = JSON.parse(this.headersCiphertext);
  var payloadCiphertext = JSON.parse(this.payloadCiphertext);

  var headers = sjcl.decrypt(secretKey, headersCiphertext, crypton.cipherOptions);
  var payload = sjcl.decrypt(secretKey, payloadCiphertext, crypton.cipherOptions);

  var headersHmac = new sjcl.misc.hmac('');
  var headersSignature = headersHmac.encrypt(headersCiphertext);
  var headersSignatureHex = sjcl.codec.hex.fromBits(headersSignature);

  var payloadHmac = new sjcl.misc.hmac('');
  var payloadSignature = payloadHmac.encrypt(payloadCiphertext);
  var payloadSignatureHex = sjcl.codec.hex.fromBits(payloadSignature);

  if (headersSignatureHex !== this.headersCiphertextHmacSignature) {
    return callback('Headers signature does not match');
  }

  if (payloadSignatureHex !== this.payloadCiphertextHmacSignature) {
    return callback('Payload signature does not match');
  }

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
    return callback('You must encrypt the message to a peer before sending!');
  }

  var url = crypton.url() + '/peer';
  superagent.post(url)
    .send(this.encrypted)
    .set('x-session-identifier', this.session.id)
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

    callback(null, res.body.messageId);
  });
};

})();
