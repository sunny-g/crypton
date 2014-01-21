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
var cors = require('cors');
var path = require('path');
var https = require('https');
var connect = require('connect');
var express = require('express');
var util = require('./lib/util');
var appsec = require('lusca');

var app = process.app = module.exports = express();
app.log = require('./lib/log');
app.config = require('./lib/config');
app.datastore = require('./lib/storage');
/*jslint camelcase: false*/
app.id_translator = require('id_translator')
    .load_id_translator(app.config.id_translator.key_file);
/*jslint camelcase: true*/

app.log('info', 'configuring server');

app.secret = util.readFileSync(
  // TODO: 'binary' encoding is deprecated
  // TODO: also do we need to do this at all?
  app.config.cookieSecretFile, 'binary',
  app.config.defaultKeySize
);

app.use(express.limit('20mb'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(cors({
  credentials: true,
  origin: function (origin, callback) {
    callback(null, true);
  }
}));

if (process.env.CRYPTON_LUSCA_CONF) {
  // Configurable security headers via ENV VAR
  // export CRYPTON_LUSCA_CONF='{csrf: true,csp:{'default-src': 'self'},xframe:'SAMEORIGIN'} //
  // P3P is not used by default, but can be used by overriding the defaults
  try {
    var luscaObj = JSON.parse(process.env.CRYPTON_LUSCA_CONF);
    // Note: starting an app like:
    //  sudo CRYPTON_LUSCA_CONF='{"csp": "foo", "csrf": "woot", "xframe": "blerg"}' crypton
    // will allow an override.

    // A naive validation check:
    if ((typeof luscaObj.csp == 'object') && (typeof luscaObj.xframe == "string")
                                          && (typeof luscaObj.csrf == 'boolean')) {
      app.use(appsec(luscaObj));
    } else {
      throw new Error("Lusca configuration invalid!");
    }
  } catch (ex) {
    app.log("warn", "Cannot parse Lusca security JSON string from ENV var: " + ex);
    process.exit(1);
  }
} else {
  // A very strict CSP, CSRF enabled and xframe options as sameorigin.
  app.use(appsec({
    csrf: true,
    csp: { 'default-src': 'self',
           'script-src': 'self',
           'img-src': 'self',
           'style-src': 'self',
           'font-src': 'self',
           'object-src': 'none'
         },
    xframe: 'SAMEORIGIN'
  }));
}

var redis = require('redis').createClient(
  app.config.redis.port,
  app.config.redis.host, {
    /*jslint camelcase: false*/
    auth_pass: app.config.redis.pass
    /*jslint camelcase: true*/
  }
);

var RedisStore = require('connect-redis')(express);
app.sessionStore = new RedisStore({
  client: redis,
  prefix: 'crypton.sid:'
});

app.use(express.session({
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

if (app.config.appPath) {
  var appPath = path.resolve(process.cwd(), app.config.appPath);
  app.use(express.static(appPath));
  app.use(express.static(__dirname + '/../client/dist'));
}

app.options('/*', function (req, res) {
  res.send('');
});

app.start = function start () {
  app.log('info', 'starting HTTPS server');

  var privateKeyPath = path.resolve(process.cwd(), app.config.privateKey);
  var certificatePath = path.resolve(process.cwd(), app.config.certificate);
  var privateKeyExists = fs.existsSync(privateKeyPath);
  var certificateExists = fs.existsSync(certificatePath);
  var privateKeyRealPath = privateKeyExists ? privateKeyPath : __dirname + '/config/privateKeyExample.pem';
  var certificateRealPath = certificateExists ? certificatePath : __dirname + '/config/certificateExample.pem';

  var options = {
    key: fs.readFileSync(privateKeyRealPath).toString(),
    cert: fs.readFileSync(certificateRealPath).toString()
  };

  app.port = app.config.port || 443;
  app.server = https.createServer(options, app).listen(app.port, function () {
    app.log('HTTPS server listening on port ' + app.port);
    require('./lib/sockets');
  });
};

app.log('info', 'loading routes');
require('./routes');

process.on('uncaughtException', function (err) {
  app.log('fatal', err.stack);
  process.exit(1);
});
