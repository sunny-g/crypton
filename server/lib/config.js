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
var path = require('path');

var configFile;
var env = process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase();

if (process.configFile) {
  configFile = path.resolve(process.env.PWD, process.configFile);
} else if (env === 'test') {
  configFile = __dirname + '/../config.test.json';
} else {
  app.log('fatal', 'Must provide configuration file');
  process.exit(1);
}

try {
  var file = fs.readFileSync(configFile).toString();
  module.exports = JSON.parse(file);
} catch (e) {
  app.log('fatal', 'Could not parse config file:');
  app.log('fatal', e.stack);
  process.exit(1);
}
