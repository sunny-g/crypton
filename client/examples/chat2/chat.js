var app = {};

app.init = function (session) {
  app.session = session;
  app.peers = [];

  $('#header').css({
    top: 0
  });

  $('#sidebar').css({
    left: 0
  });

  $('#container').css({
    left: '300px'
  });

  app.setUsername();

  async.series([
    app.loadMetadata,
    app.syncMessages,
    app.syncPeers,
    app.renderSidebar,
    app.bind
  ], function (err) {
    if (err) {
      alert(err);
      return;
    }

    app.setStatus('Ready');
    app.createConversation();
  });
};

app.setUsername = function () {
  $('#nav .username').text(app.session.account.username);
};

app.setStatus = function (message) {
  $('#header .status').text(message);
};

app.loadMetadata = function (callback) {
  app.setStatus('Loading metadata from server...');

  app.session.create('chatMetadata', function (err) {
    if (err) {
      console.log(err);
      return;
    }

    app.session.load('chatMetadata', function (err, metadata) {
      if (err) {
        console.log(arguments);
        return;
      }

      metadata.add('conversations', function () {
        metadata.get('conversations', function (err, conversations) {
          app.metadata = metadata;
          app.conversations = conversations;
          callback();
        });
      });
    });
  });
};

app.syncMessages = function (callback) {
  app.setStatus('Syncing messages from server...');
  // get all messages
  // if they are applicable,
    // process into container
    // delete
  // update ui
  callback();
};

app.syncPeers = function (callback) {
  app.setStatus('Syncing peers from server...');

  async.each(app.conversations, function (conversation, cb) {
    var username = conversation.username;
    app.addPeer(username, cb);
  }, function (err) {
    callback(err);
  });
};

app.renderSidebar = function (callback) {
  var $sidebar = $('#sidebar');
  $sidebar.html('');

  console.log(app.conversations);
  if (!app.conversations.length) {
    $('<p />')
      .addClass('no-conversations')
      .text('There are no existing conversations')
      .appendTo($sidebar);
  }

  async.each(app.conversations, function (conversation, cb) {
    console.log(conversation);
    $('<div />').addClass('conversation').text(conversation.username).appendTo($sidebar);
    //bind
    cb();
  }, function (err) {
    callback(err);
  });
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
  $('#conversation').hide();
  $('#create-conversation').fadeIn();
  $('#create-conversation input')[0].focus();

  $('#create-conversation form').submit(function (e) {
    e.preventDefault();
    var data = $(this).serializeArray();
    var username = data[0].value;

    if (username) {
      // TODO check if conversation exists

      app.addPeer(username, function (err) {
        if (err) {
          alert(err);
          return;
        }

        $('#create-conversation').fadeOut();

        var conversation = {
          username: username,
          lastActivity: +new Date()
        };

        app.conversations[username] = conversation;

        app.metadata.save(function () {
          app.renderSidebar(function () {
            app.loadConversation(username);
          });
        });
      });
    }
  });
};

app.addPeer = function (username, callback) {
  app.session.getPeer(username, function (err, peer) {
    if (err) {
      callback(err);
      return;
    }

    app.peers[username] = peer;
    callback();
  });
};

app.loadConversation = function (username) {
  var containerName = 'conversation_' + username;
  app.session.create(containerName, function (err) {
    app.session.load(containerName, function (err, conversation) {
      app.conversation = conversation;

      conversation.add('messages', function () {
        conversation.get('messages', function (err, messages) {
          app.renderConversation(messages);
        });
      });
    });
  });
};

app.renderConversation = function (messages) {
  // clear window
  // render messages
  // render send ui
  for (var i in messages) {
    console.log(messages[i]);
  }
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

  $('#container').css({
    left: '10000px'
  });

  $('#login').css({
    top: 0
  });

  $('#login input')[0].focus();
};
