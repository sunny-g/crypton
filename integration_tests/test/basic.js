var assert = require('assert');
var Browser = require('zombie');

describe('Basic examples', function() {
  describe('Account generation', function () {
    before(function(done) {
      var url = 'http://localhost:8080/examples/basic/generateAccount.html';
      this.browser = new Browser();
      this.browser.visit(url).then(done, done);
    });

    it('should load the account generation example', function() {
      assert.equal(this.browser.location.pathname, '/examples/basic/generateAccount.html');
    });
  });

  describe('Authorization', function () {
    before(function(done) {
      var url = 'http://localhost:8080/examples/basic/authorize.html';
      this.browser = new Browser();
      this.browser.visit(url).then(done, done);
    });

    it('should load the authorization example', function() {
      assert.equal(this.browser.location.pathname, '/examples/basic/authorize.html');
    });
  });
});
