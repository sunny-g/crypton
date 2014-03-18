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
var io = require('socket.io');
var cookie = require('cookie');
var connect = require('connect');

app.log('info', 'starting socket.io');

app.io = io.listen(app.server);
app.io.set('log level', 1); // TODO make this configurable
app.clients = {};

/**!
 * Configure socket.io connection autorization
 *
 * Looks up the provided session to make sure it is valid
 */
// TODO is this necessary? we're retreiving the session on('connection')
app.io.set('authorization', function (handshakeData, accept) {
  app.log('debug', 'authorizing websocket connection');

  if (!handshakeData.headers.cookie) {
    app.log('debug', 'websocket authorization failed due to no cookies sent');
    return accept('No cookie transmitted.', false);
  } else {
    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
    var ssid = handshakeData.cookie['crypton.sid'];
    var usid = connect.utils.parseSignedCookie(ssid, app.secret);
    handshakeData.sessionId = usid;

    if (usid == ssid) {
      app.log('debug', 'websocket authorization failed due to invalid cookie');
      return accept('Cookie is invalid.', false);
    }
  } 

  app.log('debug', 'websocket authorization successful');
  accept(null, true);
});

/**!
 * Verify session, add session's accountId to socket handle,
 * and add handle to app.clients so we can look it up easily.
 * Remove handle from app.clients upon disconnection
 */
app.io.sockets.on('connection', function (socket) {
  var sid = socket.handshake.sessionId;

  app.sessionStore.get(sid, function (err, session) {
    if (err || !session) {
      // reconnect after server died and flushed sessions
      app.log('debug', 'websocket connection declined due to null session');
      return;
    }

    var accountId = session.accountId;
    socket.accountId = accountId;
    app.clients[accountId] = socket;
    app.log('debug', 'websocket connection added to pool for account: ' + accountId);
    app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');

    socket.on('disconnect', function () {
      delete app.clients[accountId];
      app.log('debug', 'websocket connection deleted for account: ' + accountId);
      app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');
    });
  });
});
