/* Crypton Client, Copyright 2013 SpiderOak, Inc.
 *
 * This file is part of Crypton Client.
 *
 * Crypton Client is free software: you can redistribute it and/or modify it
 * under the terms of the Affero GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * Crypton Client is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the Affero GNU General Public
 * License for more details.
 *
 * You should have received a copy of the Affero GNU General Public License
 * along with Crypton Client.  If not, see <http://www.gnu.org/licenses/>.
*/

var assert = chai.assert;

describe('Account', function () {
  var account = new crypton.Account();
  account.passphrase = 'pass';
  account.username = 'user';
  account.srpVerifier = 'verifier';
  account.srpSalt = 'salt';

  account.keypairSalt = [-1601113307,-147606214,-62907260,1664396850,1038241656,596952288,-1676728508,-743835030];

  account.keypairCiphertext = {"iv":"5PtD42BLh2N1A/M9KF+l8g","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"Z3+NhRZLZiyFtH0FVFx6sWQWksE5yG7Wsiyjr1RNzf2P3eayWBy+d5DbS417oEC94xgrMEGuc6lp8oKR0MvgS2Rb32US8FNCQIzLg1+kidgz4gJLd0WN+TaERoa6O3W5ARvJyWwkw7vTnk92PbTNQnuo31o7n/FNZCCkXVriBw9iqsrIFYORjSRb8EeAoxecOTK5wW5riphjfr3Scn3Rm9sgD5Ps3R1znQxiRARiv2w"};

  account.pubKey = {"point":[-814316318,1020697195,358800030,2142462487,-1630869932,477045498,1093057837,354832449,1063888822,-1054421197,-1933044690,-1955745963,-1020314082,-2106178156,-95968818,1241660716,-314482104,1807577500,1811162725,-1270122694,-377237982,1917786300,1311599981,1075655987],"curve":384};

  account.symKeyCiphertext =[1243127374,-874272957,-264228200,-1453158182,438342754,1182255140,884225542,-1204693896,-436097068,563643357,1411388321,-1924282403,-756350478,1643683828,-386465580,2006255534,-627964371,755872376,-725931272,-928801328,-2065686341,-735712476,352918313,388227430];

  account.containerNameHmacKeyCiphertext = {"iv":"YFeYPJXn2bztkD1zOFmiFQ","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"6MNWGoSboynaTA1cBVOGhtNXMTF75n6xSs5gdVZqDKkd32CyUnzuNYcJWP2E6qeWC850/I8uC5LFPFa6PTyOMA5rc9KBFv+J4X648nBP+kaxelenK2XnT1d6iETVU7iu"};

  account.hmacKeyCiphertext = {"iv":"tqrCZxNtLYXKkU2O96cnpg","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"93FNMpuKSPajTV4z4iJDw806TiNaDxBcM60UiU/vz+yFviPuzJgmVVuF7wf1kUDfPKYSBzKvDX51yOT2h9a4I6C3kgttooU/NOn3nJdb480zVgFjHrTso1/kTTqwaDm6u9DA"};

  account.signKeyPub = {"point":[-544178132,115453517,-1912575641,920110764,762420811,2037665175,69508748,-1944972765,-1220788834,-1964704246,-846945090,879724614],"curve":192};

  account.signKeyPrivateCiphertext = {"iv":"qgXT725sFea1sK9prEQMPQ","v":1,"iter":1000,"ks":128,"ts":64,"mode":"gcm","adata":"","cipher":"aes","ct":"u/LY6VUAqjWfySGCgdOYmjpLY1aLpbZjcMqaJIG7EuB5ZMQi4FxXuiyPe4cvgYl03as7LNJuR2vpun0DXmj0/xlIGeux52PYmoGYqXDWk6hLg9W5UM+/wV/MaZ7LPkIml98NAlSes/hGo4rT"};

  describe('save()', function () {
    // TODO should we just test this in the integration tests?
  });

  describe('unravel()', function () {
    it('should generate the correct fields from given values', function (done) {
      account.unravel(function () {
        var fields = [
          'srpVerifier',
          'srpSalt',
          'secretKey',
          'pubKey',
          'symkey',
          'containerNameHmacKey',
          'hmacKey',
          'signKeyPub',
          'signKeyPrivate'
        ];

        for (var i in fields) {
          assert(typeof account[fields[i]] !== undefined);
        }

        done();
      });
    });
  });

  describe('serialize()', function () {
    it('should return the correct fields', function (done) {
      var expected = [
        'srpVerifier',
        'srpSalt',
        'containerNameHmacKeyCiphertext',
        'hmacKeyCiphertext',
        'keypairCiphertext',
        'pubKey',
        'keypairSalt',
        'symKeyCiphertext',
        'username',
        'signKeyPub',
        'signKeyPrivateCiphertext'
      ];
      var serialized = account.serialize();
      assert.deepEqual(Object.keys(serialized), expected);

      done();
    });

    it('should return the correct values', function () {
      var ret = account.serialize();
      assert.deepEqual(ret.containerNameHmacKeyCiphertext, account.containerNameHmacKeyCiphertext);
      assert.deepEqual(ret.srpVerifier, account.srpVerifier);
      assert.deepEqual(ret.srpSalt, account.srpSalt);
      assert.deepEqual(ret.hmacKeyCiphertext, account.hmacKeyCiphertext);
      assert.deepEqual(ret.keypairCiphertext, account.keypairCiphertext);
      assert.deepEqual(ret.pubKey, account.pubKey);
      assert.deepEqual(ret.challengeKeySalt, account.challengeKeySalt);
      assert.deepEqual(ret.keypairSalt, account.keypairSalt);
      assert.deepEqual(ret.symkeyCiphertext, account.symkeyCiphertext);
      assert.deepEqual(ret.username, account.username);
      assert.deepEqual(ret.signKeyPub, account.signKeyPub);
      assert.deepEqual(ret.signKeyPrivateCiphertext, account.signKeyPrivateCiphertext);
    });
  });
});
