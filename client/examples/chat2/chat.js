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

  if (!Object.keys(app.conversations).length) {
    console.log('nope');
    $('<p />')
      .addClass('no-conversations')
      .text('There are no existing conversations')
      .appendTo($sidebar);
  }

  for (var i in app.conversations) {
    var conversation = app.conversations[i];
    console.log('got here', conversation);

    var $conversation = $('<div />').addClass('conversation');
    $('<span />').addClass('username').text(conversation.username).appendTo($conversation);
    $('<span />').addClass('activity').text(conversation.lastActivity).appendTo($conversation);
    $conversation.appendTo($sidebar);
    //bind
  }

  callback();
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

    // TODO change to inverse to get rid of extra indent
    if (username) {
      if (app.conversations[username]) {
        $('#create-conversation').hide();
        app.loadConversation(username);
        return;
      }

      app.addPeer(username, function (err) {
        if (err) {
          alert(err);
          return;
        }

        $('#create-conversation').hide();

        var conversation = {
          username: username,
          lastActivity: +new Date()
        };

        app.conversations[username] = conversation;

        app.metadata.save(function (err) {
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
  // TODO there's a better way to do this, let's just pass it in
  var conversationWith = app.conversation.name.split('_')[1];
  var $conversations = $('#sidebar .conversation');
  $conversations.removeClass('active');
  $conversations.each(function () {
    var username = $(this).find('.username').text();
    if (username == conversationWith) {
      $(this).addClass('active');
    }
  });

  var $messages = $('#conversation #messages');
  $messages.html();

  for (var i in messages) {
    app.renderMessage(messages[i]);
  }

  $('#conversation').show();
  $('#conversation-input input').val('').focus();

  $('#conversation-input').focus().submit(function (e) {
    e.preventDefault();
    var message = $(this).serializeArray()[0].value;
    $(this).find('input').val('');
    app.sendMessage(message);
  });
};

app.renderMessage = function (message) {
  console.log(message);
};

app.sendMessage = function (message) {
  console.log(app.conversation, message);
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
