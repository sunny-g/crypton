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

/**!
 * A simple CLI to start the server
 *
 * ````
 * Usage: crypton [options]
 *
 * Options:
 *
 *   -h, --help           output usage information
 *   -V, --version        output the version number
 *   -c, --config [file]  Specify a custom configuration file [default config]
 * ````
 */

var fs = require('fs');
var program = require('commander');

program
  .version('0.0.2')
  .option('-c, --config [file]', 'Specify a custom configuration file [default config]')
  .parse(process.argv);

process.configFile = program.config;

if (require.main === module) {
  var app = require('../app');
  app.start();
}
