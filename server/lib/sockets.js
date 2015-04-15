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

app.log('info', 'starting socket.io');

app.clients = {};

function getToken (socket) {
  var obj = JSON.parse(socket.handshake.query.joinServerParameters);
  app.log('debug', 'getToken() : ' + obj.token);
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

/**
 * Verify session, add session's accountId to socket handle,
 * and add handle to app.clients so we can look it up easily.
 * Remove handle from app.clients upon disconnection
 */
app.io.sockets.on('connection', function (socket) {
  app.log('debug', 'socket.io on(\'connection\')');
  var sid = getToken(socket);
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
