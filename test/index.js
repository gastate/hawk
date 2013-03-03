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

            req.authorization = Hawk.getAuthorizationHeader(Url.parse('http://example.com:8080/resource/4?filter=a'), req.method, { credentials: credentials, ext: 'some-app-data' });
            expect(req.authorization).to.exist;

            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

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

            var reqHeader = Hawk.getAuthorizationRequestHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data', payload: payload, contentType: req.headers['content-type'] });
            req.headers.authorization = reqHeader.header;

            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                expect(Hawk.validatePayload(payload, credentials, artifacts.hash, req.headers['content-type'])).to.equal(true);

                var res = {
                    headers: {
                        'content-type': 'text/plain'
                    }
                };

                res.headers.authorization = Hawk.getAuthorizationResponseHeader(artifacts, { payload: 'some reply', contentType: 'text/plain', ext: 'response-specific' });
                expect(res.headers.authorization).to.exist;

                expect(Hawk.validateResponse(res, artifacts, 'some reply')).to.equal(true);
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

            req.authorization = Hawk.getAuthorizationHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' });
            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

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

            req.authorization = Hawk.getAuthorizationHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' });
            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                expect(artifacts.ext).to.equal('some-app-data');
                expect(Hawk.validatePayload('hola!', credentials, artifacts.hash)).to.be.true;
                expect(Hawk.validatePayload('hello!', credentials, artifacts.hash)).to.be.false;
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

            req.authorization = Hawk.getAuthorizationHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data', app: 'asd23ased', dlg: '23434szr3q4d' });
            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

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

            req.authorization = Hawk.getAuthorizationHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, payload: 'hola!', ext: 'some-app-data' });
            Hawk.authenticate(req, credentialsFunc, { payload: 'byebye!' }, function (err, credentials, artifacts) {

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

            req.authorization = Hawk.getAuthorizationHeader('http://example.com:8080/resource/4?filter=a', req.method, { credentials: credentials, ext: 'some-app-data' });
            req.url = '/something/else';

            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(credentials).to.exist;
                done();
            });
        });
    });

    describe('#authenticate', function () {

        it('should parse a valid authentication header (sha1)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="1", ts="1353788437", nonce="k3j4h2", mac="zy79QQ5/EYFmQqutVnYb73gAc/U=", ext="hello"',
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                done();
            });
        });

        it('should parse a valid authentication header (sha256)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/1?b=1&a=2',
                host: 'example.com',
                port: 8000,
                authorization: 'Hawk id="dh37fgj492je", ts="1353832234", nonce="j4h3g2", mac="m8r1rHbXN6NgO+KIIhjO7sFRyd78RNGVUwehe8Cp2dU=", ext="some-app-data"',
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353832234000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                done();
            });
        });

        it('should parse a valid authentication header (POST with payload)', function (done) {

            var req = {
                method: 'POST',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123456", ts="1357926341", nonce="1AwuJD", hash="qAiXIVv+yjDATneWxZP2YCTa9aHRgQdnH9b3Wc+o3dg=", ext="some-app-data", mac="UeYcj5UoTVaAWXNvJfLVia7kU3VabxCqrccXP8sUGC4="',
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1357926341000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');
                done();
            });
        });

        it('should fail on missing hash', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/1?b=1&a=2',
                host: 'example.com',
                port: 8000,
                authorization: 'Hawk id="dh37fgj492je", ts="1353832234", nonce="j4h3g2", mac="m8r1rHbXN6NgO+KIIhjO7sFRyd78RNGVUwehe8Cp2dU=", ext="some-app-data"',
            };

            Hawk.authenticate(req, credentialsFunc, { payload: 'body', localtimeOffsetMsec: 1353832234000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Missing required payload hash');
                done();
            });
        });

        it('should fail on a stale timestamp', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123456", ts="1362337299", nonce="UzmxSs", ext="some-app-data", mac="wnNUxchvvryMH2RxckTdZ/gY3ijzvccx4keVvELC61w="',
            };

            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Stale timestamp');
                var header = err.response.headers['WWW-Authenticate'];
                var ts = header.match(/^Hawk ts\=\"(\d+)\"\, tsm\=\"([^\"]+)\"\, error=\"Stale timestamp\"$/);
                var now = Hawk.utils.now();
                expect(parseInt(ts[1], 10)).to.be.within(now - 1, now + 1);

                var res = {
                    headers: {
                        'www-authenticate': header
                    }
                };

                expect(Hawk.validateTimestamp(res, credentials)).to.equal(true);
                done();
            });
        });

        it('should fail on a replay', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="bXx7a7p1h9QYQNZ8x7QhvDQym8ACgab4m3lVSFn4DBw=", ext="hello"',
            };

            var memoryCache = {};
            var options = {
                localtimeOffsetMsec: 1353788437000 - Hawk.utils.now(),
                nonceFunc: function (nonce, ts, callback) {

                    if (memoryCache[nonce]) {
                        return callback(new Error());
                    }

                    memoryCache[nonce] = true;
                    return callback();
                }
            };

            Hawk.authenticate(req, credentialsFunc, options, function (err, credentials, artifacts) {

                expect(err).to.not.exist;
                expect(credentials.user).to.equal('steve');

                Hawk.authenticate(req, credentialsFunc, options, function (err, credentials, artifacts) {

                    expect(err).to.exist;
                    expect(err.response.payload.message).to.equal('Invalid nonce');
                    done();
                });
            });
        });

        it('should fail on an invalid authentication header: wrong scheme', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Basic asdasdasdasd'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.not.exist;
                done();
            });
        });

        it('should fail on an invalid authentication header: no scheme', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: '!@#'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Invalid header syntax');
                done();
            });
        });

        it('should fail on an missing authorization header', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080
            };

            Hawk.authenticate(req, credentialsFunc, {}, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.isMissing).to.equal(true);
                done();
            });
        });

        it('should fail on an missing host header', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                headers: {
                    authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
                }
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Invalid Host header');
                done();
            });
        });

        it('should fail on an missing authorization attribute (id)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Missing attributes');
                done();
            });
        });

        it('should fail on an missing authorization attribute (ts)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Missing attributes');
                done();
            });
        });

        it('should fail on an missing authorization attribute (nonce)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Missing attributes');
                done();
            });
        });

        it('should fail on an missing authorization attribute (mac)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Missing attributes');
                done();
            });
        });

        it('should fail on an unknown authorization attribute', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", x="3", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Unknown attribute: x');
                done();
            });
        });

        it('should fail on an bad authorization header format', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123\\", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Bad header format');
                done();
            });
        });

        it('should fail on an bad authorization attribute value', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="\t", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Bad attribute value: id');
                done();
            });
        });

        it('should fail on an empty authorization attribute value', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Bad attribute value: id');
                done();
            });
        });

        it('should fail on duplicated authorization attribute key', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", id="456", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Duplicate attribute: id');
                done();
            });
        });

        it('should fail on an invalid authorization header format', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk'
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Invalid header syntax');
                done();
            });
        });

        it('should fail on an bad host header (missing host)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                headers: {
                    host: ':8080',
                    authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
                }
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Invalid Host header');
                done();
            });
        });

        it('should fail on an bad host header (pad port)', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                headers: {
                    host: 'example.com:something',
                    authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
                }
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Invalid Host header');
                done();
            });
        });

        it('should fail on credentialsFunc error', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            var credentialsFunc = function (id, callback) {

                return callback(new Error('Unknown user'));
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown user');
                done();
            });
        });

        it('should fail on missing credentials', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            var credentialsFunc = function (id, callback) {

                return callback(null, null);
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Unknown credentials');
                done();
            });
        });

        it('should fail on invalid credentials', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            var credentialsFunc = function (id, callback) {

                var credentials = {
                    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                    user: 'steve'
                };

                return callback(null, credentials);
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.message).to.equal('Invalid credentials');
                expect(err.response.payload.message).to.equal('An internal server error occurred');
                done();
            });
        });

        it('should fail on unknown credentials algorithm', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcUyW6EEgUH4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            var credentialsFunc = function (id, callback) {

                var credentials = {
                    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                    algorithm: 'hmac-sha-0',
                    user: 'steve'
                };

                return callback(null, credentials);
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown algorithm');
                expect(err.response.payload.message).to.equal('An internal server error occurred');
                done();
            });
        });

        it('should fail on unknown bad mac', function (done) {

            var req = {
                method: 'GET',
                url: '/resource/4?filter=a',
                host: 'example.com',
                port: 8080,
                authorization: 'Hawk id="123", ts="1353788437", nonce="k3j4h2", mac="/qwS4UjfVWMcU4jlr7T/wuKe3dKijvTvSos=", ext="hello"'
            };

            var credentialsFunc = function (id, callback) {

                var credentials = {
                    key: 'werxhqb98rpaxn39848xrunpaw3489ruxnpa98w4rxn',
                    algorithm: 'sha256',
                    user: 'steve'
                };

                return callback(null, credentials);
            };

            Hawk.authenticate(req, credentialsFunc, { localtimeOffsetMsec: 1353788437000 - Hawk.utils.now() }, function (err, credentials, artifacts) {

                expect(err).to.exist;
                expect(err.response.payload.message).to.equal('Bad mac');
                done();
            });
        });
    });

    describe('#getAuthorizationHeader', function () {

        it('should return a valid authorization header (sha1)', function (done) {

            var credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha1'
            };

            var header = Hawk.getAuthorizationHeader('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207, nonce: 'Ygvqdz', payload: 'something to write about' });
            expect(header).to.equal('Hawk id="123456", ts="1353809207", nonce="Ygvqdz", hash="bsvY3IfUllw6V5rvk4tStEvpBhE=", ext="Bazinga!", mac="7C9FoI+X70bBQQiL2E6eYm8b4zE="');
            done();
        });

        it('should return a valid authorization header (sha256)', function (done) {

            var credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            var header = Hawk.getAuthorizationHeader('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207, nonce: 'Ygvqdz', payload: 'something to write about', contentType: 'text/plain' });
            expect(header).to.equal('Hawk id="123456", ts="1353809207", nonce="Ygvqdz", hash="2QfCt3GuY9HQnHWyWD3wX68ZOKbynqlfYmuO2ZBRqtY=", ext="Bazinga!", mac="q1CwFoSHzPZSkbIvl0oYlD+91rBUEvFk763nMjMndj8="');
            done();
        });

        it('should return an empty authorization header on missing options', function (done) {

            var header = Hawk.getAuthorizationHeader('https://example.net/somewhere/over/the/rainbow', 'POST');
            expect(header).to.equal('');
            done();
        });

        it('should return an empty authorization header on invalid credentials', function (done) {

            var credentials = {
                key: '2983d45yun89q',
                algorithm: 'sha256'
            };

            var header = Hawk.getAuthorizationHeader('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, ext: 'Bazinga!', timestamp: 1353809207 });
            expect(header).to.equal('');
            done();
        });

        it('should return an empty authorization header on invalid algorithm', function (done) {

            var credentials = {
                id: '123456',
                key: '2983d45yun89q',
                algorithm: 'hmac-sha-0'
            };

            var header = Hawk.getAuthorizationHeader('https://example.net/somewhere/over/the/rainbow', 'POST', { credentials: credentials, payload: 'something, anything!', ext: 'Bazinga!', timestamp: 1353809207 });
            expect(header).to.equal('');
            done();
        });
    });

    describe('#getAuthorizationResponseHeader', function () {

        it('should return an empty authorization header on missing options', function (done) {

            var header = Hawk.getAuthorizationResponseHeader();
            expect(header).to.equal('');
            done();
        });

        it('should return an empty authorization header on invalid credentials', function (done) {

            var artifacts = {
                credentials: {
                    key: '2983d45yun89q'
                }
            };

            var header = Hawk.getAuthorizationResponseHeader(artifacts);
            expect(header).to.equal('');
            done();
        });

        it('should return an empty authorization header on invalid algorithm', function (done) {

            var artifacts = {
                id: '123456',
                credentials: {
                    key: '2983d45yun89q',
                    algorithm: 'hmac-sha-0'
                }
            };

            var header = Hawk.getAuthorizationResponseHeader(artifacts);
            expect(header).to.equal('');
            done();
        });
    });

    describe('#validateResponse', function () {

        it('should return false on invalid header', function (done) {

            var res = {
                headers: {
                    'authorization': 'Hawk mac="abc", bad="xyz"'
                }
            };

            expect(Hawk.validateResponse(res, {})).to.equal(false);
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

            expect(Hawk.validateResponse(res, artifacts)).to.equal(false);
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

            expect(Hawk.validateResponse(res, artifacts)).to.equal(true);
            done();
        });
    });

    describe('#validateTimestamp', function () {

        it('should fail on invalid WWW-Authenticate header format', function (done) {

            var header = 'Hawk ts="1362346425875", tsm="PhwayS28vtnn3qbv0mqRBYSXebN/zggEtucfeZ620Zo=", x="Stale timestamp"';
            expect(Hawk.validateTimestamp({ headers: { 'www-authenticate': header }}, {})).to.equal(false);
            done();
        });
    });
});
