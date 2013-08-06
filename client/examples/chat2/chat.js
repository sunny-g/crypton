var app = {};

app.init = function (session) {
  app.session = session;

  $('#header').css({
    top: 0
  });

  $('#sidebar').css({
    left: 0
  });

  app.setUsername();

  async.series([
    app.load,
    app.sync,
    app.renderAll,
    app.bind
  ], function (err) {
    if (err) {
      alert(err);
      return;
    }

    app.setStatus('Ready');
  });
};

app.setUsername = function () {
  $('#nav .username').text(app.session.account.username);
};

app.setStatus = function (message) {
  $('#header .status').text(message);
};

app.load = function (callback) {
  app.setStatus('Loading data from server...');

  app.session.create('conversations', function (err) {
    if (err) {
      console.log(err);
      return;
    }

    app.session.load('conversations', function (err, conversations) {
      if (err) {
        console.log(arguments);
        return;
      }

      app.conversations = conversations;
      callback();
    });
  });
};

app.sync = function (callback) {
  app.setStatus('Syncing messages from server...');
  // get all messages
  // if they are applicable,
    // process into container
    // delete
  // update ui
  callback();
};

app.renderAll = function (callback) {
  app.setStatus('Rendering interface...');
  callback();
};

app.renderSidebar = function () {

};

app.renderConversation = function () {

};

app.bind = function (callback) {
  $('#nav a').click(function (e) {
    e.preventDefault();
    var action = $(this).attr('data-action');
    app[action]();
  });

  callback();
};

app.createConversation = function () {

};

app.logout = function () {
  app.session = null;
  app.conversations = null;

  $('#sidebar').html('');
  $('#container').html('');

  $('#login .status').text('Logged out');

  $('body').css({
    background: '#6ab06e'
  });

  $('#header').css({
    top: '-50px'
  });

  $('#sidebar').css({
    left: '-300px'
  });

  $('#login').css({
    top: 0
  });

  $('#login input')[0].focus();
};
