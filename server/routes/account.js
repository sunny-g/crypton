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

'use strict';

var app = process.app;
var db = app.datastore;
var middleware = require('../lib/middleware');
var Account = require('../lib/account');

/*
 * Save account to server
 */
app.post('/account', function (req, res) {
  var account = new Account();
  account.update(req.body);

  account.hashChallengeKey(function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
    }

    account.save(function (err) {
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

/*
* Authorize with server
*/
app.post('/account/:username', function (req, res) {
  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    res.send({
      success: true,
      challengeKeySalt: account.challengeKeySalt
    });
  });
});

/*
* Authorize with server
*/
app.post('/account/:username/answer', function (req, res) {
  var challengeKeyResponse = req.body.challengeKey;
  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    if (typeof challengeKeyResponse != 'string') {
      challengeKeyResponse = JSON.stringify(challengeKeyResponse);
    }

    account.verifyChallenge(challengeKeyResponse, function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });

        return;
      }

      req.session.accountId = account.accountId;

      res.send({
        success: true,
        account: account.serialize(),
        sessionIdentifier: req.sessionID
      });
    });
  });
});

/*
* Change the password for account
*/
app.post('/account/:username/keyring',
  middleware.verifySession,
  function (req, res) {
    res.send({
      success: true
    });
  }
);
