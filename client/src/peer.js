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
 * # Peer(options)
 *
 * ````
 * var options = {
 *   username: 'friend' // required
 * };
 *
 * var peer = new crypton.Peer(options);
 * ````
 *
 * @param {Object} options
 */
var Peer = crypton.Peer = function (options) {
  options = options || {};

  this.accountId = options.id;
  this.session = options.session;
  this.username = options.username;
  this.pubKey = options.pubKey;
};

/**!
 * ### fetch(callback)
 * Retrieve peer data from server, applying it to parent object
 *
 * Calls back with peer data and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Function} callback
 */
Peer.prototype.fetch = function (callback) {
  if (!this.username) {
    callback('Must supply peer username');
    return;
  }

  if (!this.session) {
    callback('Must supply session to peer object');
    return;
  }

  var that = this;
  var url = crypton.url() + '/peer/' + this.username;
  superagent.get(url)
    .set('x-session-identifier', this.session.id)
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

    var peer = res.body.peer;
    that.accountId = peer.accountId;
    that.username = peer.username;
    that.pubKey = peer.pubKey;
    // this may be necessary
    var point = sjcl.ecc.curves['c' + peer.pubKey.curve].fromBits(peer.pubKey.point);
    that.pubKey = new sjcl.ecc.elGamal.publicKey(peer.pubKey.curve, point.curve, point);

    callback(null, that);
  });
};

/**!
 * ### encrypt(payload)
 * Encrypt `message` with peer's public key
 * 
 * @param {Object} payload
 * @return {Object} ciphertext
 */
Peer.prototype.encrypt = function (payload) {
  // should this be async to callback with an error if there is no pubkey?
  var ciphertext = sjcl.encrypt(this.pubKey, JSON.stringify(payload), crypton.cipherOptions);
  return ciphertext;
};

/**!
 * ### sendMessage(headers, body, callback)
 * Encrypt `headers` and `body` and send them to peer in one logical `message`
 * 
 * Calls back with message id and without error if successful
 *
 * Calls back with error if unsuccessful
 * 
 * @param {Object} headers
 * @param {Object} body
 */
Peer.prototype.sendMessage = function (headers, body, callback) {
  if (!this.session) {
    callback('Must supply session to peer object');
    return;
  }

  var headerCiphertext = this.encrypt(headers);
  var bodyCiphertext = this.encrypt(body);

  var message = {
    headers: headerCiphertext,
    body: bodyCiphertext,
    toAccount: this.accountId,
  };

  var url = crypton.url() + '/peer';
  superagent.post(url)
    .send(message)
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

