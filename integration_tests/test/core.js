
describe('Core functionality', function () {
  describe('Account generation', function () {
    it('should refuse registrations without a username', function (done) {
      crypton.generateAccount('', '', function (err, account) {
        assert.equal(err, 'Missing field: username');
        done();
      });
    });

    it('should accept registrations without a passphrase', function (done) {
      crypton.generateAccount('notSoSmart', '', function (err, account) {
        assert.equal(err, null);
        done();
      });
    });

    it('should registrations registrations without an existing username', function (done) {
      crypton.generateAccount('notSoSmart', '', function (err, account) {
        assert.equal(err, 'Username already taken.');
        done();
      });
    });
  });
});
