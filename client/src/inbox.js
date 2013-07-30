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

var Inbox = crypton.Inbox = function Inbox (session) {
  this.session = session;
  this.messages = [];

  this.poll();
};

Inbox.prototype.poll = function (callback) {
  var that = this;
  var url = crypton.url() + '/inbox';
  callback = callback || function () {};

  superagent.get(url)
    .set('session-identifier', this.session.id)
    .end(function (res) {
    if (!res.body || res.body.success !== true) {
      callback(res.body.error);
      return;
    }

    // should we merge or overwrite here?
    that.messages = res.body.messages;

    callback(null, res.body.messages);
  });
};

Inbox.prototype.list = function () {
  // TODO should we poll here?
  return this.messages();
};

Inbox.prototype.filter = function (criteria, callback) {
};

Inbox.prototype.get = function (id, callback) {
  // id = array or number
};

Inbox.prototype.delete = function (callback) {
  // start + commit tx
};

Inbox.prototype.clear = function () {
  // start + commit tx
};


function Message () {
  // id
  // from
  // to
  // timestamp
  // size
  // ttl
  // headers
  // body
  // raw?
};

Message.prototype.getHeaders = function (callback) {
};

Message.prototype.getBody = function (callback) {
};

Message.prototype.delete = function (callback) {
  // start + commit tx
};

})();
