// Load modules

var Url = require('url');
var Chai = require('chai');
var Hawk = require('../lib');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Hawk', function () {

    var credentialsFunc = function (id, callback) {

        var credentials = {
            id: id,
            key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
            algorithm: (id === '1' ? 'sha1' : 'sha256'),
            user: 'steve'
        };

        return callback(null, credentials);
    };

    it('should generate a header then successfully parse it (configuration)', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header(Url.parse('http://example.com:8080/resource/4?filter=a'), req.method, { credentials: credentials, ext: 'some-app-data' }).header;
            expect(req.authorization).to.exist;

            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                done();
            });
        });
    });

    it('should generate a header then successfully parse it (node request)', function (done) {

        var req = {
            method: 'POST',
            url: '/resource/4?filter=a',
            headers: {
                host: 'example.com:8080',
                'content-type': 'text/plain;x=y'
            }
        };

        var payload = 'some not so random text';

        credentialsFunc('123456', function (err, credentials) {

            var reqHeader = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data', payload: payload, contentType: req.headers['content-type'] });
            req.headers.authorization = reqHeader.header;

            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                expect(Hawk.server.authenticatePayload(payload, credentials, artifacts.hash, req.headers['content-type'])).to.equal(true);

                var res = {
                    headers: {
                        'content-type': 'text/plain'
                    }
                };

                res.headers.authorization = Hawk.server.header(artifacts, { payload: 'some reply', contentType: 'text/plain', ext: 'response-specific' });
                expect(res.headers.authorization).to.exist;

                expect(Hawk.client.authenticate(res, artifacts, 'some reply')).to.equal(true);
                done();
            });
        });
    });

    it('should generate a header then successfully parse it (with hash)', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' }).header;
            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                done();
            });
        });
    });

    it('should generate a header then successfully parse it then validate payload', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' }).header;
            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                expect(Hawk.server.authenticatePayload('hola!', credentials, artifacts.hash)).to.be.true;
                expect(Hawk.server.authenticatePayload('hello!', credentials, artifacts.hash)).to.be.false;
                done();
            });
        });
    });

    it('should generate a header then successfully parse it (app, dlg)', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data', app: 'asd23ased', dlg: '23434szr3q4d' }).header;
            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                expect(artifacts.app).to.equal('asd23ased');
                expect(artifacts.dlg).to.equal('23434szr3q4d');
                done();
            });
        });
    });

    it('should generate a header then fail authentication due to bad hash', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' }).header;
            Hawk.server.authenticate(req, credentialsFunc, { payload: 'byebye!' }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Bad payload hash');
                done();
            });
        });
    });

    it('should generate a header for one resource then fail to authenticate another', function (done) {

        var req = {
            method: 'GET',
            url: '/resource/4?filter=a',
            host: 'example.com',
            port: 8080
        };

        credentialsFunc('123456', function (err, credentials) {

            req.authorization = Hawk.client.header('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data' }).header;
            req.url = '/something/else';

            Hawk.server.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(credentials).to.exist;
                done();
            });
        });
    });
});
