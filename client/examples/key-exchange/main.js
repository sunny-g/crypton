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
             + '<span class="modal-content-header">Your Fingerprint is:</span>'
             + '<div class="fingerprint-txt" id="' + fingerprint  + '">' // XXXddahl: make this "Fingerprint card and identicon downloadbale as an image"
             + fingerprint
             + '</div>'
             + '<p class="identicon-header">'
             + '<span class="modal-content-header">Your Identicon is:</span>'
             + '</p>'
             + '<p id="placeholder"></p>'
             + '<div class="modal-content-header">Your Account ID is: '
             + '<span>'
             + username
             + '</span>'
             + '</div>'
             + '<div class="instruction">'
             + '<p>'
             + 'In order to share messages and data with others, you must first share your Fingerprint, Account ID and this application with others. '
             + '</p>'
             + '<p>Your Identicon is also helpful to your friend as it is a graphic representation of your Fingerprint. '
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

  // XXXddahl: make 2 fingerprints for now, 1 larger one is better than 2
  var str = fingerprint;
  var halfway = Math.round(str.length/2);
  var first = str.slice(0, halfway);
  var second = str.slice(halfway);
  html = '<span>'
       + first
       + '</span>'
       + '<span>'
       + second
       + '</span>';

  var nodes = $(html);
  $('#placeholder').append(nodes);

  $('#placeholder span').identicon5({
    rotate: true,
    size: 175
  });

  $('.modal-dialog-close').click(function (){ $('.modal-dialog').remove(); });
};

app.dismissModalDialog = function (){
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
    app.displayPeerFingerPrint(peer.username, fingerprint);
  });
};

app.displayPeerFingerPrint = function (username, fingerprint) {
  var trusted = app.peers[username].trusted;

  var html = '<div class="modal-dialog">'
           + '<p class="modal-content">'
           + '<span class="modal-content-header">Fingerprint:</span>'
           + '<div class="fingerprint-txt" id="' + fingerprint  + '">' // XXXddahl: make this "Fingerprint card and identicon downloadbale as an image"
           + fingerprint
           + '</div>'
           + '<p class="identicon-header">'
           + '<span class="modal-content-header">Identicon:</span>'
           + '</p>'
           + '<p id="placeholder"></p>'
           + '<div class="modal-content-header">Account ID: '
           + '<span>'
           + username
           + '</span>'
           + '<br />';
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

  $('#app').prepend(dialog);

  // XXXddahl: make 2 fingerprints for now, 1 larger one will be better
  var str = fingerprint;
  var halfway = Math.round(str.length/2);
  var first = str.slice(0, halfway);
  var second = str.slice(halfway);
  html = '<span>'
       + first
       + '</span>'
       + '<span>'
       + second
       + '</span>';

  var nodes = $(html);
  $('#placeholder').append(nodes);

  $('#placeholder span').identicon5({
    rotate: true,
    size: 175
  });

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
