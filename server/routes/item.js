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

var app = process.app;
var db = app.datastore;
var middleware = require('../lib/middleware');
var verifySession = middleware.verifySession;
var Item = require('../lib/item');

/**!
 * ### GET /item/:itemNameHmac
 * Retrieve item value for the given `itemNameHmac`
*/
app.get('/item/:itemNameHmac', verifySession, function (req, res) {
  app.log('debug', 'handling GET /item/:itemNameHmac');

  var accountId = req.session.accountId;
  var itemNameHmac = req.params.itemNameHmac;

  var item = new Item();
  item.update('accountId', accountId);

  item.get(itemNameHmac, function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      records: item.value
    });
  });
});

/**!
 * ### POST /item/:itemNameHmac
 * Update item value for the given `itemNameHmac`
*/
app.post('/item/:itemNameHmac', verifySession, function (req, res) {
  var value = req.body.value;
  var item = new Item();
  item.update(req.body);

  item.save(function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }

    res.send({
      success: true
    });
  });
});
