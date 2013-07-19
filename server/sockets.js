var app = process.app;
var io = require('socket.io');
var cookie = require('cookie');
var connect = require('connect');

app.log('info', 'starting socket.io');

app.io = io.listen(app.server);
app.clients = {};

app.io.set('authorization', function (handshakeData, accept) {
  if (!handshakeData.headers.cookie) {
    return accept('No cookie transmitted.', false);
  } else {
    handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
    var ssid = handshakeData.cookie['crypton.sid'];
    var usid = connect.utils.parseSignedCookie(ssid, app.secret);
    handshakeData.sessionId = usid;

    if (usid == ssid) {
      return accept('Cookie is invalid.', false);
    }
  } 

  //var session = app.sessionStore.get(usid, function () {
    //console.log(arguments);
    accept(null, true);
  //});
});

app.io.sockets.on('connection', function (socket) {
  var sid = socket.handshake.sessionId;
  var rawSession = app.sessionStore.sessions[sid]

  if (!rawSession) {
    // reconnect after server died and flushed sessions
    return;
  }

  var session = JSON.parse(rawSession);
  app.clients[session.accountId] = socket;

  socket.on('disconnect', function () {
    delete app.clients[session.accountId];
  });
});
