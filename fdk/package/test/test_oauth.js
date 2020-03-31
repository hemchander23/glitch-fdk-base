'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const passportRefresh = require('passport-oauth2-refresh');
const request = require('supertest');
const sinon = require('sinon');
const tmp = require('tmp');

const httpUtil = require('../lib/utils/http-util');
const cryptoUtil = require('../lib/utils/crypto-util');

function deleteOauthCache() {
  delete require.cache[require.resolve(__dirname + '/../lib/routes/oauth2')];
  delete require.cache[require.resolve(__dirname + '/../lib/cli/run')];
  delete require.cache[require.resolve(__dirname + '/../lib/api/oauth')];
}

function reloadOAuth() {
  require('../lib/routes/oauth2');
  require('../lib/cli/run');
  require('../lib/api/oauth');
}

describe('Oauth Test', () => {
  let server, projDir, validator;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    validator = require('../lib/validations/oauth-validation');
  });

  after(() => {
    deleteOauthCache();
  });

  afterEach(() => {
    try {
      server.close();
      projDir.removeCallback();
    }
    catch (e) {
      console.log(e);
    }
  });

  it('should fail - invalid oauth config', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql(['Mandatory key(s) missing in oauth_config.json - token_type.']);
    done();
  });

  it('should fail - invalid oauth config - invalid JSON', (done) => {
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    fs.writeFileSync(oauthConfigFile, '{');
    expect(validator.validate()).eql(['oauth_config.json - Unexpected end of JSON input']);
    done();
  });

  it('should fail - invalid oauth iparam - type', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-type.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql(['Invalid type \'integer\' found in oauth_config.json.']);
    done();
  });

  it('should fail - invalid oauth iparam - reserved key', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-reserved-key.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql(['Reserved keywords display_name used as keys in oauth_config.json.']);
    done();
  });

  it('should fail - invalid oauth iparam - invalid key', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-reserved-key.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql(['Reserved keywords display_name used as keys in oauth_config.json.']);
    done();
  });

  it('should fail - invalid oauth iparam - empty key', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-empty-key.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql(['The oauth_iparams key should be a non-empty string.']);
    done();
  });

  it('should fail - invalid oauth iparam - missing mandatory keys', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-missing-mandatory-key.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql([ 'Mandatory key(s) display_name missing for subdomain in oauth_config.json.' ]);
    done();
  });

  it('should fail - invalid oauth iparam - invalid additional keys', (done) => {
    const invalidOauthConfigFile = __dirname + '/../test-res/iparam/invalid_oauth_iparam-invalid-key.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(invalidOauthConfigFile, oauthConfigFile);
    require(__dirname + '/../lib/manifest').reload();
    expect(validator.validate()).eql([ 'Invalid keys in oauth_config.json' ]);
    done();
  });

  it('should succeed - Oauth auth index', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .get('/auth/index?callback=dummy')
      .send()
      .end((a, b) => {
        expect(global.strategyOptions.customHeaders.sampleHeader).to.eql('hello');
        expect(global.strategyOptions.customHeaders.encodedHeader).to.eql('aGVsbG8=');
        expect(b.status).to.eql(httpUtil.status.found);
        request(server)
          .get('/accesstoken')
          .end((a, b) => {
            expect(b.status).to.eql(httpUtil.status.ok);
            request(server)
              .get('/iframe/api')
              .end((a, b) => {
                expect(b.status).to.eql(httpUtil.status.ok);
                done();
              });
          });
      });
  });

  it('should succeed - Oauth auth callback', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .get('/auth/callback?callback=dummy')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should succeed - Fetching oauth iparams', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config_iparam.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .get('/oauth_iparams')
      .send()
      .expect(httpUtil.status.ok, '{"subdomain":{"display_name":"subdomain","description":"subdomain","type":"text","required":true}}', done);
  });

  it('should succeed - Fetching oauth iparams - not specified', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .get('/oauth_iparams')
      .send()
      .expect(httpUtil.status.ok, '{}', done);
  });

  it('should succeed - Oauth refresh', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send({action: 'refresh'})
      .set({
        'content-type':'application/json',
        'MKP-ROUTE': 'oauth'
      })
      .expect(httpUtil.status.found, done);
  });

  it('should fail - Oauth refresh', (done) => {
    passportRefresh.requestNewAccessToken.restore();
    sinon.stub(passportRefresh, 'requestNewAccessToken').callsFake((a, b, c) => {
      c('sdf');
    });
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send({action: 'refresh'})
      .set({
        'content-type':'application/json',
        'MKP-ROUTE': 'oauth'
      })
      .expect(httpUtil.status.found, done);
  });

  it('should succeed - Agent Oauth auth index', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/agent_oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    deleteOauthCache();
    reloadOAuth();

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .get('/auth/index?callback=dummy')
      .send()
      .end((a, b) => {
        expect(b.status).to.eql(httpUtil.status.ok);
        done();
      });
  });

  it('should succeed - Agent Oauth refresh', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/agent_oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';

    deleteOauthCache();
    reloadOAuth();

    passportRefresh.requestNewAccessToken.restore();
    sinon.stub(passportRefresh, 'requestNewAccessToken').callsFake((a, b, c) => {
      c(null, 'abcdefghij', 'abcdefghij');
    });

    global.shouldCallbackOAuthInit = false;

    fs.copySync(validOauthConfigFile, oauthConfigFile);
    server = require('../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send({action: 'refresh',
        tokens: {
          access_token: cryptoUtil.encryptToken('abcdefghij'),
          refresh_token: cryptoUtil.encryptToken('abcdefghij')
        }})
      .set({
        'content-type':'application/json',
        'MKP-ROUTE': 'oauth'
      })
      .end((a, b) => {
        expect(b.status).to.eql(httpUtil.status.ok);
        expect(b.body).to.have.a.property('tokens');
        expect(b.body.tokens).to.have.a.property('access_token');
        expect(b.body.tokens).to.have.a.property('refresh_token');
        global.shouldCallbackOAuthInit = true;
        done();
      });
  });

});
