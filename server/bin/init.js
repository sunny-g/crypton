var fs = require('fs');
var pg = require('pg').native;
var config = require('../lib/config');
var oldConfig;

module.exports = function () {
  oldConfig = JSON.parse(JSON.stringify(config));
  config.database.user = 'postgres';
  config.database.database = 'postgres';

  createUser(function () {
    createDatabase(function () {
      config = oldConfig;
      createSchema(function () {
        console.log('Done');
        process.exit();
      });
    });
  });
};

function connect (callback) {
  pg.connect(config.database, function (err, client, done) {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    callback(client, done);
  });
};

function createUser (callback) {
  console.log('Creating user...');

  connect(function (client, done) {
    var query = {
      text: 'create user crypton_test_user with encrypted password \'crypton_test_user_password\''
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        console.log(err);
        return callback();
      }

      console.log('User created');
      callback();
    });
  });
}

function createDatabase (callback) {
  console.log('Creating database...');

  connect(function (client, done) {
    var query = {
      text: 'create database crypton_test with owner = crypton_test_user'
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        console.log(err);
        return callback();
      }

      console.log('Database created');
      callback();
    });
  });
}

function createSchema (callback) {
  console.log('Creating schema...');

  connect(function (client, done) {
    var file = fs.readFileSync(__dirname + '/../lib/stores/postgres/sql/setup.sql').toString();
    var query = {
      text: file
    };

    client.query(query, function (err, result) {
      done();

      if (err) {
        console.log(err);
        return callback();
      }

      console.log('Schema created');
      callback();
    });
  });
}
