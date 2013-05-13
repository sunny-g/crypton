var httpServer = require('http-server');
var server = require('../server/app');
var serversStarted = 0;

server.listen(3000, function () {
  console.log('\ncrypton server listening on port 3000');
  serversStarted++;
});

var server = httpServer.createServer({
  root: '../client',
  cache: false,
});

server.listen(8080, 'localhost', function () {
  console.log('crypton client listening on port 8080');
  serversStarted++;
});

beforeEach(function (done) {
  while (serversStarted < 2) {}
  done();
})

require('./test');
