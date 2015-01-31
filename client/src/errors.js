/* Crypton Client, Copyright 2015 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Crypton Client is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Client is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Client.  If not, see <http://www.gnu.org/licenses/>.
*/

(function() {

'use strict';

var errors = crypton.errors = function Item () {
  // Crypton system error strings
  this.ARG_MISSING_CALLBACK = 'Callback argument is required';
  this.ARG_MISSING_STRING = 'String argument is required';
  this.ARG_MISSING_OBJECT = 'Object argument is required';
  this.ARG_MISSING = 'Missing required argument';
  this.PROPERTY_MISSING = 'Missing object property';
};

})();
