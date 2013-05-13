var assert = require('assert');
var Browser = require('zombie');

describe('Basic example', function() {
  before(function(done) {
    this.browser = new Browser('http://localhost:8080', {
      debug: true
    });

    this.browser
      .visit('/examples/basic', { debug: true })
      .then(done, done);
  });

  it('should load the basic example', function() {
    console.log(this.browser.error);
    console.log(this.browser.html());
    assert.equal(this.browser.location.pathname, '/examples/basic');
  });
});
