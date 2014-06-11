/* Crypton Client, Copyright 2014 SpiderOak, Inc.
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

$(document).ready(function () {
  $('#login input').first().focus();

  $('#login button').click(function () {
    $(this).addClass('clicked');
  });

  $('#login form').submit(function (e) {
    e.preventDefault();

    var $inputs = $('#login input');
    var user = $inputs.first().val();
    var pass = $inputs.last().val();
    var action = $('#login button.clicked')[0].className.split(' ')[0];
    $('#login button').removeClass('clicked');

    if (action == 'login') {
      app.login(user, pass);
    } else {
      app.register(user, pass, function (err) {
        if (err) {
          app.setLoginStatus(err);
          return;
        }

        app.login(user, pass, true);
      });
    }
  });
});

var app = {};

app.setLoginStatus = function (m) {
  $('#login .status').text(m);
};

app.login = function (user, pass, isNewAccount) {
  app.setLoginStatus('Logging in...');

  crypton.authorize(user, pass, function (err, session) {
    if (err) {
      app.setLoginStatus(err);
      return;
    }

    app.session = session;
    app.boot(isNewAccount);
  });
};

app.register = function (user, pass, callback) {
  app.setLoginStatus('Generating account...');

  crypton.generateAccount(user, pass, function (err) {
    callback(err);
  });
};

app.peers = {};

app.getPeer = function (username, callback) {
  if (app.peers[username]) {
    return callback(null, app.peers[username]);
  }

  app.session.getPeer(username, function (err, peer) {
    if (err) {
      return callback(err);
    }

    app.peers[username] = peer;
    callback(null, peer);
  });
};

app.boot = function (isNewAccount) {
  if (isNewAccount) {
    // show a dialog on how to share a fingerprint to exchange keys
    app.displayFingerprintInstructions(app.session.account.fingerprint,
                                       app.session.account.username);
  }

  $('#login').hide();
  $('#app').show();

  // set events
  app.bind();
};

app.displayFingerprintInstructions = function (fingerprint, username) {
  var html = '<div class="modal-dialog">'
             + '<p class="modal-content">'
             + '<p class="identicon-header">'
             + '<span class="modal-content-header">Your Identigrid:</span>'
             + '</p>'
             + '<p id="placeholder"></p>'
             + '<div class="instruction">'
             + '<p>'
             + 'In order to share messages and data with others, you must first share your Fingerprint, Account ID and this application with others. '
             + '</p>'
             + '<p>Your Identigrid is also helpful to your friend as it is a graphic representation of your Fingerprint. '
             + '</p>'
             + '<p>'
             + 'Your friend will need to install this application, create an account, lookup your account ID and verifiy the Fingerprint the application provides against this one.'
             + '</p>'
             + '<p>'
             + 'You will also verify their Fingerprint. Only then can you safely exchange data or messages.'
             + '</p>'
             + '</div>'
             + '<button class="modal-dialog-close">close</button>'
             + '</p>'
             + '</div>';
  var dialog = $(html);

  $('#app').prepend(dialog);

  var canvas = app.createIdentigridCanvas(fingerprint, username, app.APPNAME)
  $('#placeholder').append(canvas);

  // Make it downloadable
  var link = $('<p><a id="download-identigrid">Download Identigrid Image</a></p>');
  // XXXddahl: add another link to download just the QR code by itself
  //           for a script to parse via: https://github.com/LazarSoft/jsqrcode
  $('#placeholder').append(link);

  document.getElementById('download-identigrid').
    addEventListener('click', function() {
    var filename = username + 'identigrid.png';
    app.downloadCanvas(this, 'identigrid', filename);
  }, false);

  $('.modal-dialog-close').click(function (){ $('.modal-dialog').remove(); });
};

app.APPNAME = 'Crypton Account Verifier';

app.url = 'https://localhost/';

app.generateQRCodeInput = function (fingerprint, username, application, url) {
  var json = JSON.stringify({ fingerprint: fingerprint, username: username,
                              application: application, url: url });
  return json;
};

app.createFingerprintArr = function (fingerprint) {
  if (fingerprint.length != 64) {
    var err = 'Fingerprint has incorrect length';
    console.error(err);
    throw new Error(err);
  }
  fingerprint = fingerprint.toUpperCase();
  var fingerArr = [];
  var i = 0;
  var segment = '';
  for (var chr in fingerprint) {
    segment = segment + fingerprint[chr];
    i++;
    if (i == 4) {
      fingerArr.push(segment);
      i = 0;
      segment = '';
      continue;
    }
  }
  return fingerArr;
};

app.createColorArr = function (fingerArr) {
  // pad the value out to 6 digits:
  var count = 0;
  var paddingData = fingerArr.join('');
  var colorArr = [];
  var REQUIRED_LENGTH = 6;
  for (var idx in fingerArr) {
    var pad  = (REQUIRED_LENGTH - fingerArr[idx].length);
    if ( pad == 0) {
      colorArr.push('#' + fingerArr[idx]);
    } else {
      var color = '#' + fingerArr[idx];
      for (var i = 0; i < pad; i++) {
        color = color + paddingData[count];
        count++;
      }
      colorArr.push(color);
    }
  }
  return colorArr;
};

app.dismissModalDialog = function () {
  $('.modal-dialog').remove();
};

app.bind = function () {
  $('#fingerprint-instructions').click(function (){
    app.displayFingerprintInstructions(app.session.account.fingerprint,
                                       app.session.account.username);});
  $('#find-someone-btn').click(function () { app.findSomeone(); });
};

app.findSomeone = function () {
  var username = $('#find-username').val();
  if (!username) {
    var err = "Please enter a username";
    console.error(err);
    alert(err);
  }

  app.getPeer(username, function (err, peer){
    if (err) {
      console.log(err);
      alert(err);
      return;
    }
    var fingerprint = peer.fingerprint;
    app.displayPeerFingerprint(peer.username, fingerprint);
  });
};

app.createIdentigridCanvas = function (fingerprint, username, application) {
  var fingerArr = app.createFingerprintArr(fingerprint);
  var colorArr = app.createColorArr(fingerArr);
  var canvas = $('<canvas id="identigrid" width="420" height="420"></canvas>');
  var ctx = canvas[0].getContext("2d");
  var x = 0;
  var y = 0;
  var w = 50;
  var h = 50;

  ctx.fillStyle = "black";

  y = y + 20;
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(username, x, y);

  y = y + 30;
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(application, x, y);

  y = y + 30;
  ctx.font = "bold 24px sans-serif";
  ctx.fillText('FINGERPRINT', x, y);
  ctx.font = "24px sans-serif";

  var i = 0;
  var line = '';
  idx = 0;
  for (var j = 0; j < fingerArr.length; j++) {
    if (i == 3) {
      line = line + fingerArr[j];
      y = (y + 25);
      ctx.fillText(line, x, y);
      i = 0;
      line = '';
    } else {
      line = line + fingerArr[j] + ' ';
      i++;
    }
  }

  y = y + 20;

  for (var idx in colorArr) {
    ctx.fillStyle = colorArr[idx];
    ctx.fillRect(x, y , w, h);
    x = (x + 50);
    if (x == 200) {
      x = 0;
      y = (y + 50);
    }
  }

  // generate QRCode
  var qrData = app.generateQRCodeInput(fingerArr.join(" "), username,
                                     application, app.URL);
  new QRCode(document.getElementById("hidden-qrcode"),
             { text: qrData,
               width: 200,
               height: 200,
               colorDark : "#000000",
               colorLight : "#ffffff",
               correctLevel : QRCode.CorrectLevel.H
             });

  var qrCanvas = $('#hidden-qrcode canvas')[0];
  ctx.drawImage(qrCanvas, 210, 200);
  $('#hidden-qrcode canvas').remove();

  return canvas;
};

app.downloadCanvas = function (link, canvasId, filename) {
  link.href = document.getElementById(canvasId).toDataURL();
  link.download = filename;
}

app.displayPeerFingerprint = function (username, fingerprint) {
  var trusted = app.peers[username].trusted;

  var html = '<div class="modal-dialog">'
           + '<p class="modal-content">'
           + '<div class="modal-content-header">Username: '
           + '<span>'
           + username
           + '</span>'
           + '<br />'
           + '<div id="placeholder"></div>';
  if (trusted){
    html = html + '<span id="trusted-peer-label">VERIFIED PEER</span>';
  } else {
    html = html + '<button id="verify-btn">Verify User</button>';
  }
  html = html + '</div>'
       + '<button class="modal-dialog-close">close</button>'
       + '</p>'
       + '</div>';
  var dialog = $(html);
  var identigrid =
    app.createIdentigridCanvas(fingerprint, username, app.APPNAME);
  // Make it downloadable
  var link = $('<p><a id="download-identigrid">Download Identigrid Image</a></p>');
  // XXXddahl: add another link to download just the QR code by itself
  //           for a script to parse via: https://github.com/LazarSoft/jsqrcode
  dialog.append(link);

  $('#app').prepend(dialog);
  $('#placeholder').append(identigrid);

  document.getElementById('download-identigrid').
    addEventListener('click', function() {
    var filename = username + 'identigrid.png';
    app.downloadCanvas(this, 'identigrid', filename);
  }, false);

  $('.modal-dialog-close').click(function (){
    $('.modal-dialog').remove();
    app._currentPeer = null;
  });

  $('#verify-btn').click(function (){
    app.verifyPeer();
  });

  app._currentPeer = username;
};

app.verifyPeer = function () {
  if (!app._currentPeer) {
    console.error("currentPeer not available");
    return;
  }
  var conf = 'Does the Identicon and Fingerprint match the ones sent to you by '
           + app._currentPeer + '?'
           + '\n\nJust clicking \'OK\' without '
           + 'visually verifying is a cop-out!';
  if (window.confirm(conf)) {
    var peer = app.peers[app._currentPeer];
    peer.trust(function (err) {
      if (err) {
        var msg = "Peer.trust failed: " + err;
        console.error(msg);
      } else {
        alert('Peer ' + app._currentPeer + 'is now trusted ');
        $('.modal-dialog').remove();
      }
    });
  }
};
