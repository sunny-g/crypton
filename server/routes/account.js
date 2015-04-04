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
var config = app.config;
var middleware = require('../lib/middleware');
var Account = require('../lib/account');

/**!
 * ### POST /account
 * Translate posted body to an account object,
 * then save the resulting account object to the server
*/
app.post('/account', function (req, res) {
  app.log('debug', 'handling POST /account');

  app.log('debug', JSON.stringify(req.session));
  app.log('debug', JSON.stringify(res.session));

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
  app.log('debug', 'req.sessionId');
  app.log('debug', JSON.stringify(req.sessionID));
  app.log('debug', 'req Keys:');
  app.log('debug', Object.keys(req));
  app.log('debug', JSON.stringify(res.sessionID));
  app.log('debug', 'res Keys:');
  app.log('debug', Object.keys(res));

  res.set('X-Session-ID', req.sessionID);

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
      console.log('srpParams: ', srpParams);
      console.log('req.session: ', req.session);
      req.session.srpParams = srpParams;

      app.setRedisCache(req.sessionID, srpParams, function (err, reply) {
        if (err) {
          res.send({success: false, error: err});
          return;
        }
        res.send({
          sessionID: req.sessionID,
          success: true,
          srpB: srpParams.B,
          srpSalt: account.srpSalt
	});
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
app.post('/account/:username/answer', function (req, res) {
  app.log('debug', 'handling POST /account/:username/answer');
  
  app.log('debug', req.sessionID); // this session ID is a new one! must ignore!
  app.log('debug', req.body.sessionId);
  if (typeof req.session.srpParams == 'undefined') {
    app.getRedisCache(req.body.sessionId, function (err, srpData) {
      if (err) {
        app.log('error', err);
        res.send({success: false, error: 'srp cache failure'});
        return;
      }
      app.log('info', 'srpData: ');
      app.log('info', srpData);
      // check out the reply from redis...
      if (typeof srpData != 'object') {
        res.send({
	  success: false,
          error: 'Session invalid'
        });
        return; 
      }
      // Looks like we have srpData!
      var srpParams = srpData;
      finishSrp(srpParams, req.body.sessionId);
    });
  } else {
    // Cookies work
    finishSrp(req.session.srpParams, req.sessionID);
  }

  function finishSrp(params, sessionId) {
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

      account.checkSrp(params, srpM1, function (err, srpM2) {
        // XXXddahl: fix this later... delete req.session.srpParams;
        if (err) {
          app.log('debug', 'SRP verification failed: ' + err);
          res.send({
            success: false,
            error: err
          });

          return;
        }

        app.log('debug', 'SRP verification succcess');
        try {
          req.session.accountId = account.accountId;
        } catch (ex) {
          app.log('error', ex);
        }
        app.redisClient.set(sessionId, {accountId: account.accountId}, 
        function (err, reply) {
          res.send({
            success: true,
            account: account.toJSON(),
            sessionIdentifier: sessionId,
            srpM2: srpM2.toString('hex')
           });
        });
        
      });
    });
  }
});

/**!
 * ### POST /account/:username/keyring
 * Placeholder route for posting regenerated
 * keyring data after a password change
*/
app.post('/account/:username/keyring',
  middleware.verifySession,
  function (req, res) {
    app.log('debug', 'handling POST /account/:username/keyring');
    var account = new Account();
    account.get(req.params.username, function (err) {
      if (err) {
        res.send({
          success: false,
          error: err
        });
        return;
      }
      // Let's update the account
      var newAccountData = {};
      for (var key in req.body) {
        newAccountData[key] = req.body[key];
      }
      // Need the account ID
      newAccountData.accountId = account.accountId

      // Write new keyring into the database
      account.changePassphrase(newAccountData, function (err) {
        if (err) {
          app.log('debug', err);
          res.send({
            success: false,
            error: 'Could not update passphrase'
          });
          return;
        }
        // success
        res.send({
          success: true
        });
        // XXXddahl: TODO: invalidate the user's session,
        // any connected clients other than this one will be force logged out
      });
    });
  }
);

/**!
 * ### GET /accountBuffer
 * If there is a maximumUsers configuration variable set,
 * return the amount of free accounts - otherwise, return null.
*/
app.get('/accountBuffer', function (req, res) {
  if (!config.maximumUsers) {
    return res.send({
      success: true,
      accountBuffer: null
    });
  }

  db.getUserCount(function (err, userCount) {
    if (err) {
      return res.send({
        success: false,
        error: 'Database error'
      });
    }

    var accountBuffer = config.maximumUsers - userCount;

    res.send({
      success: true,
      accountBuffer: accountBuffer
    });
  });
});
