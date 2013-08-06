var app = {};

app.init = function (session) {
  window.session = session;

  $('#header').css({
    top: 0
  });

  $('#sidebar').css({
    left: 0
  });
};

