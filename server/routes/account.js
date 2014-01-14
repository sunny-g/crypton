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

/**!
 * ### POST /account
 * Translate posted body to an account object,
 * then save the resulting account object to the server
*/
app.post('/account', function (req, res) {
  app.log('debug', 'handling POST /account');

  var account = new Account();
  account.update(req.body);

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

/**!
 * ### POST /account/:username
 * Retrieve account belonging to `username`,
 * send srpSalt so client can set up its SRP
 * state.
*/
app.post('/account/:username', function (req, res) {
  app.log('debug', 'handling POST /account/:username');

  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      app.log('debug', 'could not get account for ' + req.params.username);
      res.send({
        success: false,
        error: err
      });

      return;
    }

    account.beginSrp(req.body.srpA, function(err, srpParams) {
      if (err) {
        res.send({
          success: false,
          error: err
        });

        return;
      }

      req.session.srpParams = srpParams;
      res.send({
        success: true,
        srpB: srpParams.B,
        srpSalt: account.srpSalt
      });
    });
  });
});

/**!
 * ### POST /account/:username/answer
 * Retrieve account belonging to `username`,
 * verify that the SRP M parameter is valid.
 * If successful, start a session.
*/
app.post('/account/:username/answer', middleware.verifySession, function (req, res) {
  app.log('debug', 'handling POST /account/:username/answer');

  if (typeof req.session.srpParams == 'undefined') {
    res.send({
      success: false,
      error: 'Session invalid'
    });

    return;
  }

  var srpM1 = req.body.srpM1;
  var account = new Account();

  account.get(req.params.username, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    account.checkSrp(req.session.srpParams, srpM1, function (err) {
      delete req.session.srpParams;
      if (err) {
        app.log('debug', 'SRP verification failed: ' + err);
        res.send({
          success: false,
          error: err
        });

        return;
      }

      app.log('debug', 'SRP verification succcess');
      req.session.accountId = account.accountId;

      res.send({
        success: true,
        account: account.toJSON(),
        sessionIdentifier: req.sessionID
      });
    });
  });
});

/**!
 * ### POST /account/:username/keyring
 * Placeholder route for posting regenerated
 * keyring data after a password change
*/
// TODO implement this!
app.post('/account/:username/keyring',
  middleware.verifySession,
  function (req, res) {
    app.log('debug', 'handling POST /account/:username/keyring');
    res.send({
      success: true
    });
  }
);
