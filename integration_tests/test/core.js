
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

  describe('Authorization', function () {
    it('should accept correct username/passphrase combinations', function (done) {
      crypton.authorize('notSoSmart', '', function (err, session) {
        assert.equal(err, null);
        assert.equal(session.account.username, 'notSoSmart');
        done();
      });
    });

    it('should refuse invalid usernames', function (done) {
      crypton.authorize('iDontExist', '', function (err, session) {
        assert.equal(err, 'Account not found.');
        done();
      });
    });

    it('should refuse incorrect passphrases', function (done) {
      crypton.authorize('notSoSmart', 'notMyPassword', function (err, session) {
        assert.equal(err, 'Incorrect password');
        done();
      });
    });
  });
});
