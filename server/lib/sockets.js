
'use strict';

var app = process.app;
var io = require('socket.io');
var cookie = require('cookie');
var connect = require('connect');

app.log('info', 'starting socket.io');

app.io = io.listen(app.server);
app.clients = {};

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
