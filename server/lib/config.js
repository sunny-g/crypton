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
var app = require('../app');

/**!
 * Attempt to load a provided `config.json` file, falling back to the example file
 */

var configFile;

if (process.configFile) {
  configFile = path.resolve(process.env.PWD, process.configFile);
} else {
  configFile = __dirname + '/../config/config.test.json';
}

try {
  var file = fs.readFileSync(configFile).toString();
  module.exports = JSON.parse(file);
} catch (e) {
  app.log('fatal', 'could not parse config file');
  throw e;
}
