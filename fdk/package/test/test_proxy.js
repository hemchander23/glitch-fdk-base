'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const nock = require('nock');
const request = require('supertest');
const tmp = require('tmp');

const nsUtil = require('../lib/utils/ns-resolver');
const httpUtil = require('../lib/utils/http-util');
const proxymFile = __dirname + '/../test-res/manifest/manifest_proxy.json';
const DataStore = require('../lib/utils/data-store');
const storage = new DataStore({});

function keyNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth`;
}

describe('Proxy test', () => {
  let projDir, server, destmfFile;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    destmfFile = projDir.name + '/manifest.json';
    fs.copySync(proxymFile, destmfFile);
    require(__dirname + '/../lib/manifest').reload();
  });

  beforeEach( () => {
    server = require('../lib/cli/run').run();
  });

  afterEach( () => {
    server.close();
  });

  it('should make request', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    storage.store(keyNamespace(), 'access token');
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www.google.com',
        isOAuth: true
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should make request with oauth iparam', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config_iparam.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    storage.store(keyNamespace(), 'access token');
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www.google.com',
        isOAuth: true
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should make request - valid substitution', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'post',
        url: 'https://www.httpbin.org/post',
        json: { hello : '<%= encode(\'world\') %>'}
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((req, res) => {
        expect(res.body.response.json.hello).to.eql('d29ybGQ=');
        done();
      });
  });

  it('should make request - APP error', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www.httpbin.org/status/500'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((req, res) => {
        expect(res.body.errorSource).to.eql('APP');
        expect(res.body.status).to.eql(httpUtil.status.internal_server_error);
        done();
      });
  });

  it('should fail request - invalid substitution', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www.httpbin.org',
        headers: { Authorization : '<%= y.er %>'}
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should succeed request - add err source', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://httpbin.org/status/400'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((err, res) => {
        console.log(err);
        expect(res.body.errorSource).to.eql('APP');
        done();
      });
  });

  it('should succeed request - random route', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://abcdefghijklok.abcdefghijkl.kiolp/'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .expect(httpUtil.status.ok, done);
  });

  it('should fail request - Not FQDN', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www._abc.com'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((err, res) => {
        console.log(err);
        expect(res.statusCode).to.equal(httpUtil.status.ok);
        expect(res.body.response).to.equal('Invalid URL - Must be FQDN');
        done();
      });
  });

  it('should fail request - Not HTTPS', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'http://httpbin.org/get'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((err, res) => {
        console.log(err);
        expect(res.statusCode).to.equal(httpUtil.status.ok);
        expect(res.body.response).to.equal('Invalid URL - Must be HTTPS');
        done();
      });
  });

  it('should fail request - IP', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://127.0.0.1'
      }
    };

    request(server)
      .post('/dprouter')
      .send(payload)
      .set({
        'MKP-ROUTE': 'proxy'
      })
      .end((err, res) => {
        console.log(err);
        expect(res.statusCode).to.equal(httpUtil.status.ok);
        expect(res.body.response).to.equal('Invalid URL - IP is disallowed');
        done();
      });
  });

  it('should fail request - unsupported content type', (done) => {
    const payload = {
      action: 'execute',
      data:
      {
        method: 'get',
        url: 'https://www.google.com'
      }
    };

    nock('https://www.google.com').get('/').reply(httpUtil.status.ok, {}, {
      'content-type': 'application/text'
    });
    request(server)
      .post('/dprouter')
      .send(payload)
      .set({ 'MKP-ROUTE': 'proxy' })
      .end((err, resp) => {
        console.log(err);
        expect(resp.statusCode).to.equal(httpUtil.status.ok);
        expect(resp.text).to.equal('{"status":415,"headers":{},"response":"Unsupported content type","errorSource":"APP"}');
        done();
      });
  });

});
