/* Crypton Client, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. 
 *
*/

(function () {

'use strict';

var Diff = crypton.diff = {};

/**!
 * ### create(old, current)
 * Generate an object representing the difference between two inputs
 *
 * @param {Object} old
 * @param {Object} current
 * @return {Object} delta
 */
Diff.create = function (old, current) {
  var delta = jsondiffpatch.diff(old, current);
  return delta;
};

/**!
 * ### apply(delta, old)
 * Apply `delta` to `old` object to build `current` object
 *
 * @param {Object} delta
 * @param {Object} old
 * @return {Object} current
 */
// TODO should we switch the order of these arguments?
Diff.apply = function (delta, old) {
  var current = JSON.parse(JSON.stringify(old));
  jsondiffpatch.patch(current, delta);
  return current;
};

})();

