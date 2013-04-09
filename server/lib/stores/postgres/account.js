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

var connect = require('./').connect;

/* Save a new account
 * Add keyring info to it */
exports.saveAccount = function saveAccount(account, callback) {
  connect(function (client, done) {
    client.query('begin');

    var accountQuery = {
      text:
        "insert into account (username, base_keyring_id) " +
        "values ($1, nextval('version_identifier')) " +
        "returning account_id, base_keyring_id",
      values: [
        account.username
      ]
    };

    client.query(accountQuery, function (err, result) {
      if (err) {
        client.query('rollback');
        done();

        if (err.code === '23505') {
          callback('Username already taken.');
        } else {
          console.log('Unhandled database error: ' + err);
          callback('Database error.');
        }

        return;
      }

      var keyringQuery = {
        text:
          "insert into base_keyring (" +
          "  base_keyring_id, account_id," +
          "  keypair, keypair_salt, pubkey, symkey," +
          "  container_name_hmac_key," +
          "  hmac_key, challenge_key_salt, challenge_key_hash" +
          ") values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        values: [
          result.rows[0].base_keyring_id,
          result.rows[0].account_id,
          account.keypairCiphertext,
          account.keypairSalt,
          account.pubKey,
          account.symkeyCiphertext,
          account.containerNameHmacKeyCiphertext,
          account.hmacKeyCiphertext,
          account.challengeKeySalt,
          account.challengeKeyHash
        ]
      };

      client.query(keyringQuery, function (err) {
        if (err) {
          client.query('rollback');
          done();

          if (err.code === '23514') {
            callback('Invalid keyring data.');
          } else {
            console.log('Unhandled database error: ' + err);
            callback('Database error.');
          }

          return;
        }

        client.query('commit', function () {
          done();
          callback();
        });
      });
    });
  });
};


/* Get an account and its keyring */
exports.getAccount = function getAccount(username, callback) {
  connect(function (client, done) {
    client.query({
      text: "select username,"
          + "  account.account_id, base_keyring_id," +
"challenge_key_hash, challenge_key_salt, keypair, keypair_salt, pubkey, symkey, container_name_hmac_key, hmac_key "
          + "from account left join base_keyring using (base_keyring_id) "
          + "where username=$1",
      values: [username]
    }, function (err, result) {
      done();

      if (err) {
        console.log('Unhandled database error: ' + err);
        callback('Database error.');
        return;
      }
      if (!result.rows.length) {
        callback('Account not found.');
        return;
      }

      callback(null, {
        username: result.rows[0].username,
        accountId: result.rows[0].account_id,
        keyringId: result.rows[0].base_keyring_id,
        keypairSalt: JSON.parse(result.rows[0].keypair_salt.toString()),
        keypairCiphertext: JSON.parse(result.rows[0].keypair.toString()),
        pubKey: JSON.parse(result.rows[0].pubkey.toString()),
        symkeyCiphertext: JSON.parse(result.rows[0].symkey.toString()),
        challengeKeySalt: JSON.parse(result.rows[0].challenge_key_salt.toString()),
        challengeKeyHash: result.rows[0].challenge_key_hash.toString(),
        containerNameHmacKeyCiphertext: JSON.parse(result.rows[0].container_name_hmac_key.toString()),
        hmacKeyCiphertext: JSON.parse(result.rows[0].hmac_key.toString())
      });
    });
  });
};
