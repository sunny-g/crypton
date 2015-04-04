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

var middleware = module.exports = {};

/**!
 * ### verifySession(req, res, next)
 * Determine if the `session-identifier` header exists in the session store
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
middleware.verifySession = function (req, res, next) {
  var session = req.session;

  app.log('debug', 'req.sessionId');
  app.log('debug', JSON.stringify(req.sessionId));
  app.log('debug', 'req Keys:');
  app.log('debug', Object.keys(req));
  app.log('debug', JSON.stringify(res.session));
  app.log('debug', 'res Keys:');
  app.log('debug', Object.keys(res));

  app.log('debug', 'verifySession() headers: \n' + Object.keys(req.headers));
  app.log('debug', '\n' + JSON.stringify(req.headers));

  app.log('debug', 'req.session: \n' +  Object.keys(req.session));
  app.log('debug', '\n' + JSON.stringify(req.session));

  app.log('debug', 'x-session-id: ' + req.headers['x-session-id']);

  var sid = req.headers['x-session-id'];
    
  app.log(req.headers['x-session-id']);
  // keep this value in sessionStorage, send on each connection as a header
  // See if we can ressurect the session object via the crypton.sid in the headers:
  res.set('X-Session-ID', sid);

  if (!session || !session.accountId) {
    app.log('debug', 'session ' + req.sessionId + ' invalid');

      app.sessionStore.get(sid, function (err, session) {
	if (err || !session) {
	  app.log('debug', err);
        // reconnect after server died and flushed sessions
        app.log('debug', 'websocket connection declined due to null session');
        return res.send({
          success: false,
          error: 'Invalid session'
        });
      }
      req.session = session;
      next();
    });
  }
  next();
};
