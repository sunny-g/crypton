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

var fs = require('fs');
var https = require('https');
var connect = require('connect');
var express = require('express');
var util = require('./lib/util');

var app = process.app = module.exports = express();
app.log = require('./lib/log');
app.config = require('./lib/config');
app.datastore = require('./lib/storage');
/*jslint camelcase: false*/
app.id_translator = require('id_translator')
    .load_id_translator(app.config.id_translator.key_file);
/*jslint camelcase: true*/

var allowCrossDomain = function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods',
             'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers',
             'x-requested-with,content-type,session-identifier');
  next();
};

app.log('info', 'configuring server');

app.secret = util.readFileSync(
  // TODO: 'binary' encoding is deprecated
  // TODO: also do we need to do this at all?
  app.config.cookieSecretFile, 'binary',
  app.config.defaultKeySize
);

app.sessionStore = new express.session.MemoryStore();
app.use(connect.cookieParser());
app.use(allowCrossDomain);
app.use(express.bodyParser());

app.use(connect.session({
  secret: app.secret,
  store: app.sessionStore,
  key: 'crypton.sid',
  cookie: {
    secure: true
  }
}));

app.use(express.logger(function (info, req, res) {
  var color = 'green';

  if (res.statusCode == 404) {
    color = 'red';
  }

  var line = res.statusCode.toString()[color] + ' ' + req.method + ' ' + req.url;
  app.log('info', line); 
}));

if (process.env.NODE_ENV === 'test') {
  app.use(express.static(__dirname + '/../client'));
}

app.options('/*', function (req, res) {
  res.send('');
});

app.start = function start () {
  app.log('info', 'starting HTTPS server');

  var privateKey = fs.readFileSync(__dirname + '/' + app.config.privateKey).toString();
  var certificate = fs.readFileSync(__dirname + '/' + app.config.certificate).toString();

  var options = {
    key: privateKey,
    cert: certificate
  };

  app.port = app.config.port || 443;
  app.server = https.createServer(options, app).listen(app.port, function () {
    app.log('HTTPS server listening on port ' + app.port);
    require('./sockets');
  });
};

app.log('info', 'loading routes');
require('./routes');

process.on('uncaughtException', function (err) {
  app.log('fatal', err.stack);
  process.exit(1);
});

