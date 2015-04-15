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
app.io = require('socket.io')(app.server);
// var cookie = require('cookie');
// var connect = require('connect');

app.log('info', 'starting socket.io');

// app.io = require('socket.io')({
//   // options go here
// });

// app.io = io.listen(app.server);
// app.io.set('log level', 1); // TODO make this configurable
app.clients = {};

/**!
 * Configure socket.io connection authorization
 *
 * Looks up the provided session to make sure it is valid
 */

// app.io.set('authorization', function (handshakeData, accept) {
//   app.log('debug', 'authorizing websocket connection');
//   app.log('debug', arguments);
//   if (!handshakeData) {
//     app.log('debug', 'handshakeData is undefined!');
//     return accept('No sessionId transmitted.', false);
//   }

//   if (!handshakeData.query.sid) {
//     app.log('debug', 'websocket authorization failed due to no sessionId sent');
//     return accept('No sessionId transmitted.', false);
//   }
//   app.log('debug', 'websocket authorization successful');
//   accept(null, true);
// });

function getToken (socket) {
  var obj = JSON.parse(socket.handshake.query.joinServerParameters);
  app.log('debug', obj.token);
  return obj.token || null;
}

app.io.use(function(socket, next) {
  if (getToken(socket)) {
    // XXXddahl: TODO: decrypt/test token as a hash of a secret
    next();
  } else {
    next(new Error('Authentication error'));
  }
  return;
});

// app.io.use(function(socket, next) {
//   var handshakeData = socket.request;
//   app.log('debug', 'socket.handshake.query: ');
//   app.log('debug', Object.keys(socket.handshake.query));
//   app.log('debug', 'handshakeData: ');
//   app.log('debug', Object.keys(handshakeData));
//   next();
// });

/**
 * Verify session, add session's accountId to socket handle,
 * and add handle to app.clients so we can look it up easily.
 * Remove handle from app.clients upon disconnection
 */
app.io.sockets.on('connection', function (socket) {
  app.log('debug', 'socket.io on(\'connection\')');
  app.log('debug', '\n\nSOCKET.....................');
  app.log('debug', Object.keys(socket));
  var sKeys = Object.keys(socket);
  app.log('debug', Object.keys(socket.client));
  for (var i=0; i < sKeys.length; i++) {
    if (typeof socket[sKeys[i]] != 'object') {
      app.log('debug', sKeys[i] + typeof socket[sKeys[i]]);
      continue;
    }
    app.log('debug', '\n\n   ' + sKeys[i] + '.................');
    app.log('debug', Object.keys(socket[sKeys[i]]));
  }



  var handshakeProp = Object.keys(socket.namespace.manager.handshaken);
  app.log('debug', handshakeProp);
  var handshakeData = socket.namespace.manager.handshaken[handshakeProp];
  app.log('debug', JSON.stringify(socket.namespace.manager.handshaken[handshakeProp]));
  var sid = handshakeData.query.sid;
  app.log('debug', sid);

  app.redisSession.get(sid, socket, function _socketCallback(data, err, info) {
    if (err) {
      app.log('debug', err);
      // No session established.
      app.log('info', 'Fatal Error: Cannot authorize WebSocket connection! No Session is established.');
      return;
    }
    app.log('debug', 'adding client to app.clients');
    var accountId = data.accountId;
    app.log('debug', 'accountId: ' + accountId);
    app.log('debug', 'socket: ' + socket);
    app.clients[accountId] = socket;
    app.log('debug', 'websocket connection added to pool for account: ' + accountId);
    app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');

    socket.on('disconnect', function () {
      delete app.clients[accountId];
      // XXXddahl: delete the session as well!
      app.log('debug', 'websocket connection deleted for account: ' + accountId);
      app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');
    });
  });

});
