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
      rawData: item.rawData // XXXddahl: Send the whole item?
    });
  });
});

/**!
 * ### POST /item/:itemNameHmac
 * Update item value for the given `itemNameHmac`
*/
app.post('/item/:itemNameHmac', verifySession, function (req, res) {
  var item = new Item();

  var accountId = req.session.accountId;
  item.update('accountId', accountId);

  var itemNameHmac = req.body.itemNameHmac;
  item.update('itemNameHmac', itemNameHmac);

  var value = req.body.payloadCiphertext;
  item.update('value', value);

  item.save(function (err, result) {
    if (err) {
      res.send({
        success: false,
        error: err
      });

      return;
    }
    res.send({
      success: true,
      result: result
    });
  });
});

/**!
 * ### POST /item/create
 * Create item value for the given `itemNameHmac`
*/
app.post('/createitem', verifySession, function (req, res) {

  app.log('debug', 'handling "create"');
  app.log('debug', req);

  var item = new Item();

  var accountId = req.session.accountId;
  item.update('accountId', accountId);

  var itemNameHmac = req.body.itemNameHmac;
  item.update('itemNameHmac', itemNameHmac);

  var wrappedSessionKey = req.body.wrappedSessionKey;
  item.update('wrappedSessionKey', wrappedSessionKey);

  var value = req.body.payloadCiphertext;
  item.update('value', value);

  // Make sure client sends all correct arguments
  if (!(value && wrappedSessionKey && itemNameHmac && accountId)) {
    res.send({
      success: false,
      error: '/item/create: missing argument error'
    });
    return;
  }

  item.create(function (err, metaData) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      itemMetaData: metaData
    });
  });
});

/**!
 * ### POST /item/remove
 * Create item value for the given `itemNameHmac`
*/
app.post('/removeitem', verifySession, function (req, res) {
  app.log('debug', 'handling "remove"');
  app.log('debug', req);

  var item = new Item();

  var accountId = req.session.accountId;
  if (!accountId) {
    res.send({
      success: false,
      error: 'Missing accountId in POST'
    });
  }
  item.update('accountId', accountId);

  var itemNameHmac = req.body.itemNameHmac;
  if (!itemNameHmac) {
    res.send({
      success: false,
      error: 'Missing itemNameHmac in POST'
    });
  }
  item.update('itemNameHmac', itemNameHmac);

  item.remove(function (err, result) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      itemMetaData: result
    });
  });
});

/**!
 * ### POST /itemshare/:itemNameHmac
 * Share item for the given `itemNameHmac` with peer
*/
app.post('/shareitem/:itemNameHmac', verifySession, function (req, res) {
  app.log('debug', 'handling GET /itemshare/:itemNameHmac');

  var accountId = req.session.accountId;
  var itemNameHmac = req.params.itemNameHmac;

  var item = new Item();

  var toUsername = req.body.toUsername;
  item.update('toUsername', toUsername);

  var sessionKeyCiphertext = req.body.sessionKeyCiphertext;
  item.update('sessionKeyCiphertext', sessionKeyCiphertext);

  item.update('accountId', accountId);
  item.update('itemNameHmac', itemNameHmac);

  item.share(function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      error: null
    });
  });
});

/**!
 * ### POST /itemunshare/:itemNameHmac
 * unshare item for the given `itemNameHmac` from peer
*/
app.post('/unshareitem/:itemNameHmac', verifySession, function (req, res) {
  app.log('debug', 'handling GET /unshareitem/:itemNameHmac');

  var accountId = req.session.accountId;
  var itemNameHmac = req.params.itemNameHmac;

  var item = new Item();

  var shareeUsername = req.body.shareeUsername;
  item.update('toUsername', shareeUsername);

  item.update('accountId', accountId);
  item.update('itemNameHmac', itemNameHmac);

  item.share(function (err) {
    if (err) {
      res.send({
        success: false,
        error: err
      });
      return;
    }

    res.send({
      success: true,
      error: null
    });
  });
});
