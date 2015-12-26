// async can be required
require('script!./vendor/async.js');
// bcrypt can be required
require('script!./vendor/bcrypt.js');
require('script!./vendor/circular-json.js');
require('script!./vendor/jsondiffpatch.min.js');
// request can be required as superagent
require('script!./vendor/request.js');

// sjcl can be required, but here we're required to make it a global (why won't the script be required globally?)
//require('script!./vendor/sjcl.js');
sjcl = require('./vendor/sjcl.js');
// io can be required
require('script!./vendor/socket.io.js');
// srp-client depends on bcrypt
require('script!./vendor/srp-client.js');

// core needs to be global for `crypton` obj
require('script!./core.js');
require('./account.js');
require('./container.js');
require('./diff.js');
require('./errors.js');
require('./history.js');
require('./inbox.js');
require('./item.js');
require('./message.js');
require('./peer.js');
require('./session.js');
require('./transaction.js');
// stubbing `isomerize`, under assumption we won't have Web Workers
require('imports?isomerize=>function(){}!./work.js');
