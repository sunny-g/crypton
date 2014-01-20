/*
conversations
  bob:
    last_message
      timestamp
      text
    mine_name
    theirs_hmac

conversation_bob
  messages
    array of alice's messages

----

let's say alice wants to chat with bob
1) she creates a container for her messages and actions
2) she shares the container with bob
3) she adds "conversation with bob" to her conversation list

4) bob's client parses the message
5) bob loads the container and adds its hmac to his conversations container
6) bob creates his own conversation_alice container
7) bob shares conversation_alice with alice

8) alice loads the container
9) alice adds the container hmac to her conversations container

so on login
1) load conversations container
2) loop through keys and render all last_messages
3) for every theirs_hmac, being polling
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

        app.login(user, pass);
      });
    }
  });
});

var app = {};

app.setLoginStatus = function (m) {
  $('#login .status').text(m);
};

app.login = function (user, pass) {
  app.setLoginStatus('Logging in...');

  crypton.authorize(user, pass, function (err, session) {
    if (err) {
      app.setLoginStatus(err);
      return;
    }

    app.session = session;
    app.boot();
  });
};

app.register = function (user, pass, callback) {
  app.setLoginStatus('Generating account...');

  crypton.generateAccount(user, pass, function (err) {
    console.log(arguments);
    callback(err);
  });
};

app.boot = function () {
  $('#login').fadeOut(function () {
    $('#app').addClass('active');
    app.getConversations(function () {
      app.renderConversations(function () {
        
      });
    });
  });

  app.session.on('message', function (message) {
    if (message.headers.action == 'containerShare') {
      // assuming the shared container is meant for this application
      var containerNameHmac = message.payload.containerNameHmac;
      app.session.loadWithHmac(containerNameHmac, function () {
        console.log(arguments);
      });
    }
  });
};

app.getConversations = function (callback) {
  app.session.load('conversations', function (err, container) {
    console.log(arguments);
    if (err == 'Container does not exist') {
      return app.session.create('conversations', function (err, container) {
        app.conversations = container;
        callback();
      });
    }

    app.conversations = container;
    callback();
  });
};

app.renderConversations = function (callback) {
  console.log(app.conversations);
};
