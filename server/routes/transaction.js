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

/**!
 * ### POST /transaction/create
 * Create a transaction for current session's `accountId`
 * and return created transaction's `transactionId`
*/
app.post('/transaction/create', verifySession, function (req, res) {
  app.log('debug', 'handling POST /transaction/create');

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

/**!
 * ### POST /transaction/:transactionId
 * Add posted body as a chunk to `transactionId`
*/
app.post('/transaction/:transactionId', verifySession, function (req, res) {
  app.log('debug', 'handling POST /transaction/:transactionId');

  var data = req.body;
  var transactionId = req.params.transactionId;
  var accountId = req.session.accountId;

  var tx = new Transaction();
  tx.get(transactionId, function (err) {
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

/**!
 * ### POST /transaction/:transactionId/commit
 * Request commit for given `transactionId`
*/
app.post('/transaction/:transactionId/commit', verifySession, function (req, res) {
  app.log('debug', 'handling POST /transaction/:transactionId/commit');

  var transactionId = req.params.transactionId;
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

/**!
 * ### DEL /transaction/:transactionId
 * Abort given `transactionId`
*/
app.del('/transaction/:id', verifySession, function (req, res) {
  app.log('debug', 'handling DEL /transaction/:id');

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
