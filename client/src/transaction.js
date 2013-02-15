(function () {
  var Transaction = crypton.Transaction = function (session, callback) {
    this.session = session;
    this.chunks = [];

    // temporary
    this.types = [
      'addAccount',
      'setBaseKeyring',
      'addContainer',
      'deleteContainer',
      'addContainerSessionKey',
      'addContainerSessionKeyShare',
      'addContainerRecord',
      'addMessage',
      'deleteMessage'
    ];

    this.create(function (err, token) {
      if (err) {
        console.log(err);
        callback(err);
        return;
      }

      this.token = token;

      callback(null, this);
    }.bind(this));
  };

  Transaction.prototype.create = function (callback) {
    var url = crypton.url() + '/transaction/create';
    superagent.post(url)
      .set('session-identifier', this.session.id)
      .end(function (res) {
      if (!res.body || res.body.success !== true) {
        callback(res.body.error);
        return;
      }

      callback(null, res.body.token);
    });
  };

  // create diffs of container and add to chunks array
  Transaction.prototype.save = function () {
    this.verify();
    for (var i in arguments) {
      console.log(typeof arguments[i]);
      var chunk = arguments[i];
      this.chunks.push(chunk);
      this.saveChunk(chunk, function (err) {
        if (err) {
          console.log(err);
        }
      });
    }
  };

  Transaction.prototype.saveChunk = function (chunk, callback) {
    this.verify();
    var url = crypton.url() + '/transaction/' + this.token;
    superagent.post(url)
      .set('session-identifier', this.session.id)
      .send(chunk)
      .end(function (res) {
        console.log(res.body);
        if (!res.body || res.body.success !== true) {
          callback(res.body.error);
          return;
        }

        callback();
      });
  };

  // push chunks to the server
  Transaction.prototype.commit = function (callback) {
    this.verify();
    var url = crypton.url() + '/transaction/' + this.token + '/commit';
    superagent.post(url)
      .set('session-identifier', this.session.id)
      .end(function (res) {
        if (!res.body || res.body.success !== true) {
          callback(res.body.error);
          return;
        }

        callback();
      });
  };

  Transaction.prototype.cancel = function (callback) {
    this.verify();
    var url = crypton.url() + '/transaction/' + this.token;
    superagent.del(url).end(function (res) {
      if (!res.body || res.body.success !== true) {
        callback(res.body.error);
        return;
      }

      callback();
    });
  };

  Transaction.prototype.verify = function () {
    if (!this.token) {
      throw new Error('Invalid transaction');
    }
  };
})();
