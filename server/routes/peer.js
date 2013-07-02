/* Crypton Server, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Server.
 *
 * Crypton Server is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Server is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Server.  If not, see <http://www.gnu.org/licenses/>.
*/

var app = process.app;
var db = app.datastore;
var middleware = require('../lib/middleware');
var verifySession = middleware.verifySession;
var Account = require('../lib/account');

app.get('/peer/:username', verifySession, function (req, res) {
  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    var peer = {
      accountId: account.accountId,
      username: account.username,
      pubKey: account.pubKey
    };

    res.send({
      success: true,
      peer: peer
    });
  });
});

app.post('/peer', verifySession, function (req, res) {
  var from = req.session.accountId;
  var to = req.body.toAccount;
  var headers = req.body.headers;
  var body = req.body.body;

  var account = new Account();
  account.accountId = to;

  account.sendMessage(from, headers, body, function (err, messageId) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      messageId: messageId
    });
  });
});
