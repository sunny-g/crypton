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
var verifySession = require('../lib/middleware').verifySession;
var Transaction = require('../lib/transaction');

// start a transaction, get a transaction token
app.post('/transaction/create', verifySession, function (req, res) {
  var accountId = req.session.accountId;

  var tx = new Transaction();
  tx.create(accountId, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      id: tx.transactionId
    });
  });
});

// update a transaction
app.post('/transaction/:token', verifySession, function (req, res) {
  var data = req.body;
  var transactionId = req.params.id;
  var accountId = req.session.accountId;

  var tx = new Transaction();
  tx.get(token, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    tx.update('interactingAccount', accountId);

    tx.add(data, function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });
        return;
      }

      res.send({
        success: true
      });
    });
  });
});

// commit a transaction
app.post('/transaction/:token/commit', verifySession, function (req, res) {
  var transactionId = req.params.id;
  var accountId = req.session.accountId;

  var tx = new Transaction();

  tx.update('interactingAccount', accountId);

  tx.get(transactionId, function (err) {
    tx.commit(function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });
        return;
      }

      res.send({
        success: true
      });
    });
  });
});

// abort a transaction w/o committing
app.del('/transaction/:id', verifySession, function (req, res) {
  var transactionId = req.params.id;
  var accountId = req.session.accountId;

  var tx = new Transaction();

  tx.update('interactingAccount', accountId);
  
  tx.get(transactionId, function (err) {
    tx.abort(function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });
        return;
      }

      res.send({
        success: true
      });
    });
  });
});
