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
  var Peer = crypton.Peer = function (options) {
    options = options || {};

    this.id = options.id;
    this.session = options.session;
    this.username = options.username;
    this.pubKey = options.pubKey;
  };

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
      .set('session-identifier', this.session.id)
      .end(function (res) {
      if (!res.body || res.body.success !== true) {
        callback(res.body.error);
        return;
      }

      var peer = res.body.peer;
      that.id = peer.id;
      that.username = peer.username;
      that.pubKey = peer.pubKey;
      // this may be necessary
      var point = sjcl.ecc.curves['c' + peer.pubKey.curve].fromBits(peer.pubKey.point);
      that.pubKey = new sjcl.ecc.elGamal.publicKey(peer.pubKey.curve, point.curve, point);

      callback(null, that);
    });
  };

  Peer.prototype.encrypt = function (message) {
    // should this be async to return an error if there is no pubkey?
    var ciphertext = sjcl.encrypt(this.pubKey, JSON.stringify(message), crypton.cipherOptions);
    return ciphertext;
  };

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
      toAccount: this.id,
    };

    var url = crypton.url() + '/peer';
    superagent.post(url)
      .send(message)
      .set('session-identifier', this.session.id)
      .end(function (res) {
      if (!res.body || res.body.success !== true) {
        callback(res.body.error);
        return;
      }

      callback(null, res.body.mid);
    });
  };
})();

