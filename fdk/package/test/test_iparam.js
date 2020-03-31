'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const httpUtil = require('../lib/utils/http-util');
const request = require('supertest');
const tmp = require('tmp');

let iparamValidator;


describe('iparam validate', () => {

  let projDir, destIparamFile, destTestDataFile, destIparamHtmlFile;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    process.chdir(projDir.name);
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
    iparamValidator = require('../lib/validations/iparam-validation');
    destIparamFile = projDir.name + '/config/iparams.json';
    destTestDataFile = projDir.name + '/config/iparam_test_data.json';
    destIparamHtmlFile = projDir.name + '/config/iparams.html';
  });

  it('should validate keys', (done) => {
    fs.removeSync(destIparamFile);
    fs.removeSync(destTestDataFile);
    fs.removeSync(destIparamHtmlFile);
    const iparamTestDataFile = __dirname + '/../test-res/iparam/valid_iparam_secure_test_data.json';
    const iparamJson = __dirname + '/../test-res/iparam/valid_iparam_secure.json';

    fs.copySync(iparamTestDataFile, destTestDataFile);
    fs.copySync(iparamJson, destIparamFile);
    expect([]).eql(iparamValidator.validate());
    done();
  });

  it('should fail', (done) => {
    const invalidIparamFile = __dirname + '/../test-res/iparam/invalid_iparam.json';
    const validIparamFile = __dirname + '/../test-res/iparam/valid_iparam.json';

    fs.copySync(invalidIparamFile, destIparamFile);
    const result = ['Invalid type \'textd\' found in iparams.json.',
      'Invalid value specified for \'required\' for \'name\' in iparams.json. It should be a boolean.',
      'Error message is missing for the regex \'test\' for \'name\' in iparams.json.',
      'Invalid regex provided for \'test\' for \'name\' in iparams.json.',
      'Regex should not be empty in iparams.json for \'email\'.',
      'For \'default_value\' of the \'email\': Please enter a valid email.',
      'Invalid value specified for \'default_value\' for \'checkbox\' in iparams.json. For checkbox, it should be a boolean.'
    ];

    expect(result).eql(iparamValidator.validate());
    fs.copySync(validIparamFile, destIparamFile);
    done();
  });

  it('should validate files when iparams.html exists', (done) => {
    const validIparamFile = __dirname + '/../test-res/iparam/valid_iparam.json';
    const testDataFile = __dirname + '/../test-res/iparam/valid_iparam_test_data.json';
    const iparamHtmlFile = __dirname + '/../test-res/iparam/valid_iparams.html';

    fs.copySync(testDataFile, destTestDataFile);
    fs.copySync(iparamHtmlFile, destIparamHtmlFile);
    fs.copySync(validIparamFile, destIparamFile);
    expect(['Unsupported File(s). Specify either iparams.html or iparams.json']).eql(iparamValidator.validate());
    done();
  });

  it('should validate iparams.html file', (done) => {
    fs.removeSync(destIparamFile);
    fs.removeSync(destIparamHtmlFile);
    const testDataFile = __dirname + '/../test-res/iparam/valid_iparam_test_data.json';
    let iparamHtmlFile = __dirname + '/../test-res/iparam/invalid_iparams.html';

    fs.copySync(testDataFile, destTestDataFile);
    fs.copySync(iparamHtmlFile, destIparamHtmlFile);
    expect(['Mandatory method(s) missing in iparams.html: getConfigs,postConfigs.']).eql(iparamValidator.validate());
    iparamHtmlFile = __dirname + '/../test-res/iparam/invalid_iparam1.html';
    fs.copySync(iparamHtmlFile, destIparamHtmlFile);
    expect(['Mandatory method(s) missing in iparams.html: postConfigs.']).eql(iparamValidator.validate());
    done();
  });

  it('evaluate custom installation page endpoints', (done) => {
    fs.removeSync(destIparamFile);
    fs.removeSync(destIparamHtmlFile);
    const iparamHtmlFile = __dirname + '/../test-res/iparam/custom_iparams.html';

    fs.copySync(iparamHtmlFile, destIparamHtmlFile);
    const server = require('../lib/cli/run').run();

    request(server)

    /*
      Fetch configuration page - must return 200
    */
      .get('/custom_configs')
      .end((e, r) => {
        expect(r.status).to.eql(httpUtil.status.ok);
        request(server)

        /*
        Fetch user iparams.html (form) - must return config/iparams.html
      */
          .get('/custom_configs/form')
          .end((e, r) => {
            expect(r.text).to.eql(fs.readFileSync(`${projDir.name}/config/iparams.html`).toString());
            request(server)

            /*
          Fetching custom installation parameters - must return empty object({}), since nothing stored
        */
              .get('/custom_configs/fetch')
              .end((e, r) => {
                expect(r.text).to.eql('{"isCustomIParam":true,"customIParams":{}}');
                request(server)

                /*
            Store custom installation parameters
          */
                  .post('/custom_configs/store')
                  .send({ 'hello': 'world' })
                  .end((e, r) => {
                    expect(r.status).to.eql(httpUtil.status.ok);
                    request(server)

                    /*
              Fetch the stored parameters - must be equal
            */
                      .get('/custom_configs/fetch')
                      .end((e, r) => {
                        expect(r.text).to.eql('{"isCustomIParam":true,"customIParams":{"hello":"world"}}');
                        done();
                        server.close();
                      });
                  });
              });
          });
      });
  });

  it('evaluate secure given via store', (done) => {
    const configUtil = require('../lib/utils/config-util');

    fs.removeSync(destIparamFile);
    fs.removeSync(destIparamHtmlFile);
    const iparamHtmlFile = __dirname + '/../test-res/iparam/custom_iparams.html';

    fs.copySync(iparamHtmlFile, destIparamHtmlFile);
    const server = require('../lib/cli/run').run();

    request(server)

      /*
        Store custom installation parameters
      */
      .post('/custom_configs/store')
      .send({ 'hello': 'world', 'hello1': 'world', '__meta': {'secure': ['hello'] }})
      .end((e, r) => {
        expect(r.status).to.eql(httpUtil.status.ok);
        request(server)

        /*
          Fetch the stored parameters - must be equal
        */
          .get('/custom_configs/fetch')
          .end((e, r) => {
            expect(r.text).to.eql('{"isCustomIParam":true,"customIParams":{"hello":"world","hello1":"world","__meta":{"secure":["hello"]}}}');
            const nonSecureiParams = configUtil.getNonSecureValues();

            expect(nonSecureiParams).to.eql({ hello1: 'world', '__meta': { 'secure': ['hello'] } });
            done();
            server.close();
          });
      });
  });

  it('evaluate secrets given via json', (done) => {
    const configUtil = require('../lib/utils/config-util');

    fs.removeSync(destIparamFile);
    fs.removeSync(destTestDataFile);
    fs.removeSync(destIparamHtmlFile);
    const iparamTestDataFile = __dirname + '/../test-res/iparam/valid_iparam_secure_test_data.json';
    const iparamJson = __dirname + '/../test-res/iparam/valid_iparam_secure.json';

    fs.copySync(iparamTestDataFile, destTestDataFile);
    fs.copySync(iparamJson, destIparamFile);
    const server = require('../lib/cli/run').run();
    const nonSecureiParams = configUtil.getNonSecureValues();

    expect(nonSecureiParams).to.eql({ username: 'test', country: 'IN', '__meta': {'secure': ['age'] } });

    done();
    server.close();
  });

  it('check custom installation endpoints for oauth app', (done) => {
    const oauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigDestFile = `${projDir.name}/config/oauth_config.json`;

    fs.copySync(oauthConfigFile, oauthConfigDestFile);
    require(__dirname + '/../lib/manifest').reload();
    const server = require('../lib/cli/run').run();

    request(server)

    /*
      Get request for custom installation page must return 302 if its oauth app (& is not authorized)
    */
      .get('/custom_configs')
      .end((e, r) => {
        expect(r.status).to.eql(httpUtil.status.found);
        fs.remove(`${projDir.name}/config/iparams.html`);
        request(server)

        /*
        Request to fetch form must return 404 if iparams.html doesn't exist in the project
      */
          .get('/custom_configs/form')
          .end((e, r) => {
            expect(r.status).to.eql(httpUtil.status.ok);
            done();
            server.close();
          });
      });

  });

});
