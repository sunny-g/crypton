
$(document).ready(function () {
  $('#username').focus();

  $('#userInput').submit(function (e) {
    e.preventDefault();
    var $btn = $(this).find('input[type=submit]:focus');
    var action = $btn.attr('value') || 'authorize';
    var username = $('#username').val();
    var passphrase = $('#password').val();
    actions[action](username, passphrase);
  });
});


actions = {};

actions.authorize = function (username, passphrase, callback) {
  setStatus('authorizing...');

  crypton.authorize(username, passphrase, function (err, session) {
    if (err) {
      setStatus(err);
      $('#userInput').show();
      $('#username').focus();
      return;
    }

    app.session = session;
    $('#userInput').hide();
    $('#username').val('');
    $('#password').val('');
    setStatus('logged in');
    // loadPhoto();
  });
}

actions.register = function (username, passphrase, callback) {
  setStatus('generating account...');

  crypton.generateAccount(username, passphrase, function (err, account) {
    if (err) {
      setStatus(err);
      $('#userInput').show();
      $('#username').focus();
      return;
    }

    setStatus('account generated');
    actions.authorize(username, passphrase);
  });
}

function createSelfPeer () {
  var selfPeer = new crypton.Peer({
    session: app.session,
    pubKey: app.session.account.pubKey,
    signKeyPub: app.session.account.signKeyPub,
    signKeyPrivate: app.session.account.signKeyPrivate
  });
  selfPeer.trusted = true;
  return selfPeer;
}

function createItem (name, value) {
  if (!name && !value) {
    throw new Error('Missing Args!');
  }
  var _item =
  new crypton.Item(name, value, app.session, createSelfPeer(),
  function callback(err, item) {
    console.log(err, item);
    if (err) {
      console.error(err);
      return;
    }
    return item;
  });
}

function setStatus (status) {
  var statusEl = document.getElementById('status');
  statusEl.innerHTML = status;
}

var app = {
  session: null
};
