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
