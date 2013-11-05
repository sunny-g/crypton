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

  for (var i in raw) {
    this[i] = raw[i];
  }

  // id
  // to
  // from
  // ttl
  // created
  // headers
  // payload
};

Message.prototype.decrypt = function (callback) {
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

})();
