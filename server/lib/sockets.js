
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

  //var session = app.sessionStore.get(usid, function () {
    //console.log(arguments);
    app.log('debug', 'websocket authorization successful');
    accept(null, true);
  //});
});

app.io.sockets.on('connection', function (socket) {
  var sid = socket.handshake.sessionId;
  var rawSession = app.sessionStore.sessions[sid]

  if (!rawSession) {
    // reconnect after server died and flushed sessions
    app.log('debug', 'websocket connection declined due to null session');
    return;
  }

  var session = JSON.parse(rawSession);
  app.clients[session.accountId] = socket;
  app.log('debug', 'websocket connection added to pool for account: ' + session.accountId);
  app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');

  socket.on('disconnect', function () {
    delete app.clients[session.accountId];
    app.log('debug', 'websocket connection deleted for account: ' + session.accountId);
    app.log('info', Object.keys(app.clients).length + ' websocket connections in pool');
  });
});
