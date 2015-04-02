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

function Errors () {};

Errors.prototype = {
  // Crypton system error strings
  ARG_MISSING_CALLBACK:  'Callback argument is required',
  ARG_MISSING_STRING: 'String argument is required',
  ARG_MISSING_OBJECT: 'Object argument is required',
  ARG_MISSING: 'Missing required argument',
  PROPERTY_MISSING: 'Missing object property',
  UNWRAP_KEY_ERROR: 'Cannot unwrap session key',
  DECRYPT_CIPHERTEXT_ERROR: 'Cannot decrypt ciphertext',
  UPDATE_PERMISSION_ERROR: 'Update permission denied',
  LOCAL_ITEM_MISSING: 'Cannot delete local Item, not currently cached',
  PEER_MESSAGE_SEND_FAILED: 'Cannot send message to peer'
};

crypton.errors = new Errors();

})();
