// Load modules

var Url = require('url');
var Chai = require('chai');
var Hawk = require('../lib');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Hawk', function () {

    describe('client', function () {

        describe('#header', function () {

            it('should return a valid authorization header (sha1)', function (done) {

                var credentials = {
                    id: '123456',
                    key: '2983d45yun89q',
                    algorithm: 'sha1'
                };

                var header = Hawk.client.header('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207, nonce: 'Ygvqdz', payload: 'something to write about' }).header;
                expect(header).to.equal('Hawk id="123456", ts="1353809207", nonce="Ygvqdz", hash="bsvY3IfUllw6V5rvk4tStEvpBhE=", ext="Bazinga!", mac="7C9FoI+X70bBQQiL2E6eYm8b4zE="');
                done();
            });

            it('should return a valid authorization header (sha256)', function (done) {

                var credentials = {
                    id: '123456',
                    key: '2983d45yun89q',
                    algorithm: 'sha256'
                };

                var header = Hawk.client.header('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207, nonce: 'Ygvqdz', payload: 'something to write about', contentType: 'text/plain' }).header;
                expect(header).to.equal('Hawk id="123456", ts="1353809207", nonce="Ygvqdz", hash="2QfCt3GuY9HQnHWyWD3wX68ZOKbynqlfYmuO2ZBRqtY=", ext="Bazinga!", mac="q1CwFoSHzPZSkbIvl0oYlD+91rBUEvFk763nMjMndj8="');
                done();
            });

            it('should return an empty authorization header on missing options', function (done) {

                var header = Hawk.client.header('https://example.net/somewhere/over/the/rainbow', 'POST').header;
                expect(header).to.equal('');
                done();
            });

            it('should return an empty authorization header on invalid credentials', function (done) {

                var credentials = {
                    key: '2983d45yun89q',
                    algorithm: 'sha256'
                };

                var header = Hawk.client.header('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207 }).header;
                expect(header).to.equal('');
                done();
            });

            it('should return an empty authorization header on invalid algorithm', function (done) {

                var credentials = {
                    id: '123456',
                    key: '2983d45yun89q',
                    algorithm: 'hmac-sha-0'
                };

                var header = Hawk.client.header('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, payload: 'something, anything!', ext: 'Bazinga!', timestamp: 1353809207 }).header;
                expect(header).to.equal('');
                done();
            });
        });

        describe('#authenticate', function () {

            it('should return false on invalid header', function (done) {

                var res = {
                    headers: {
                        'authorization': 'Hawk mac="abc", bad="xyz"'
                    }
                };

                expect(Hawk.client.authenticate(res, {})).to.equal(false);
                done();
            });

            it('should return false on invalid mac', function (done) {

                var res = {
                    headers: {
                        'content-type': 'text/plain',
                        'authorization': 'Hawk mac="_IJRsMl/4oL+nn+vKoeVZPdCHXB4yJkNnBbTbHFZUYE=", hash="f9cDF/TDm7TkYRLnGwRMfeDzT6LixQVLvrIKhh0vgmM=", ext="response-specific"'
                    }
                };

                var artifacts = {
                    method: 'POST',
                    host: 'example.com',
                    port: '8080',
                    resource: '/resource/4?filter=a',
                    ts: '1362336900',
                    nonce: 'eb5S_L',
                    hash: 'nJjkVtBE5Y/Bk38Aiokwn0jiJxt/0S2WRSUwWLCf5xk=',
                    ext: 'some-app-data',
                    app: undefined,
                    dlg: undefined,
                    mac: 'BlmSe8K+pbKIb6YsZCnt4E1GrYvY1AaYayNR82dGpIk=',
                    id: '123456',
                    credentials:
                    {
                        id: '123456',
                        key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                        algorithm: 'sha256',
                        user: 'steve'
                    }
                };

                expect(Hawk.client.authenticate(res, artifacts)).to.equal(false);
                done();
            });

            it('should return true on ignoring hash', function (done) {

                var res = {
                    headers: {
                        'content-type': 'text/plain',
                        'authorization': 'Hawk mac="XIJRsMl/4oL+nn+vKoeVZPdCHXB4yJkNnBbTbHFZUYE=", hash="f9cDF/TDm7TkYRLnGwRMfeDzT6LixQVLvrIKhh0vgmM=", ext="response-specific"'
                    }
                };

                var artifacts = {
                    method: 'POST',
                    host: 'example.com',
                    port: '8080',
                    resource: '/resource/4?filter=a',
                    ts: '1362336900',
                    nonce: 'eb5S_L',
                    hash: 'nJjkVtBE5Y/Bk38Aiokwn0jiJxt/0S2WRSUwWLCf5xk=',
                    ext: 'some-app-data',
                    app: undefined,
                    dlg: undefined,
                    mac: 'BlmSe8K+pbKIb6YsZCnt4E1GrYvY1AaYayNR82dGpIk=',
                    id: '123456',
                    credentials:
                    {
                        id: '123456',
                        key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                        algorithm: 'sha256',
                        user: 'steve'
                    }
                };

                expect(Hawk.client.authenticate(res, artifacts)).to.equal(true);
                done();
            });
        });

        describe('#validateTimestamp', function () {

            it('should fail on invalid WWW-Authenticate header format', function (done) {

                var header = 'Hawk ts="1362346425875", tsm="PhwayS28vtnn3qbv0mqRBYSXebN/zggEtucfeZ620Zo=", x="Stale timestamp"';
                expect(Hawk.client.validateTimestamp({ headers: { 'www-authenticate': header } }, {})).to.equal(false);
                done();
            });
        });
    });
});
