#!/usr/bin/env node
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
var program = require('commander');

program
  .version('0.0.1')
  .option('-c, --config [file]', 'Specify a custom configuration file [default config]')
  .option('-b, --background', 'Daemonize the Crypton server [false]')
  .parse(process.argv);

process.configFile = program.config;

if (require.main === module) {
  var app = require('../app');

  if (program.background) {
    var logPath = app.config.logFile || '/tmp/crypton.log';
    var logFile = fs.openSync(logPath, 'a');
    app.log('info', 'daemonizing process');
    app.log('info', 'log file is at ' + logPath.blue);
    require('daemon')({
      stdout: logFile,
      stderr: logFile
    });
  }

  app.start();
}
