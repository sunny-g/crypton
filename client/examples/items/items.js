
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

    window.session = session;
    $('#userInput').hide();
    $('#username').val('');
    $('#password').val('');
    setStatus('logged in');
    loadPhoto();
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

function loadPhoto () {
  var photo = window.photo = new crypton.Item('photo', window.session);
  console.log(photo);
}

function takePhoto () {

}

function setPhoto () {

}

function setStatus (status) {
  var statusEl = document.getElementById('status');
  statusEl.innerHTML = status;
}
