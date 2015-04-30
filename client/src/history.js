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

var ERRS;

var HistoryItem =
crypton.HistoryItem = function HistoryItem (session, rawData) {
  ERRS = crypton.errors;
  this.rawData = rawData;
  this.session = session;
  var record;
  if (!this.rawData.creatorUsername) {
    record = this.decryptHistoryItem(null, null); // No shortcuts for now...
    return record;
  } else {
    record = this.decryptTimelineItem(this.rawData.creatorUsername, null);
  }
  return record;
};

HistoryItem.prototype.decryptHistoryItem =
function decryptHistoryItem (creator, sessionKey) {
  if (!creator) {
    this.creator = this.session.createSelfPeer();
  } else {
    this.creator = creator;
  }

  if (sessionKey) {
    this.sessionKey = sessionKey;
  }

  var rawData = this.rawData;
  var cipherItem = rawData.ciphertext;
  var wrappedSessionKey = JSON.parse(rawData.wrappedSessionKey);

  // XXXddahl: create 'unwrapPayload()'
  var ct = JSON.stringify(cipherItem.ciphertext);
  var hash = sjcl.hash.sha256.hash(ct);
  var verified = false;
  try {
    verified = this.creator.signKeyPub.verify(hash, cipherItem.signature);
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    throw new Error(ex);
  }

  // TODO: Keep a ledger of unwrapped keys so we dont have to unwrap a key for each item

  // Check for this.sessionKey, or unwrap it
  var sessionKeyResult;
  if (!this.sessionKey) {
    sessionKeyResult =
      this.session.account.verifyAndDecrypt(wrappedSessionKey, this.creator);
    if (sessionKeyResult.error) {
      return callback(ERRS.UNWRAP_KEY_ERROR);
    }
    this.sessionKey = JSON.parse(sessionKeyResult.plaintext);
  }

  var decrypted;
  try {
    decrypted = sjcl.decrypt(this.sessionKey, ct, crypton.cipherOptions);
  } catch (ex) {
    console.error(ex);
    console.error(ex.stack);
    throw new Error(ERRS.DECRYPT_CIPHERTEXT_ERROR);
  }
  var value;
  if (decrypted) {
    try {
      this.value = JSON.parse(decrypted);
    } catch (ex) {
      console.error(ex);
      console.error(ex.stack);
      // XXXddahl: check to see if this is an actual JSON error (malformed string, etc)
      this.value = decrypted; // Just a string, not an object
    }

    this.session.historyItems.push(this.value);
    return this.value;
  }
};

HistoryItem.prototype.decryptTimelineItem =
function decryptTimelineItem (creatorName, sessionKey) {
  var that = this;
  // get creator
  this.session.getPeer(creatorName, function (err, peer) {
    if (err) {
      console.error(err);
      return { error: err };
    }
    return that.decryptHistoryItem(peer, sessionKey);
  });
};

})();
