'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('config dir validate', () => {

  let projDir, configDirValidator;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
    configDirValidator = require('../lib/validations/config-dir-validation');
  });

  it('should validate empty config dir', (done) => {
    expect([]).eql(configDirValidator.validate());
    done();
  });

  it('should not fail for valid files', (done) => {
    const validIparamFile = __dirname + '/../test-res/iparam/valid_iparam.json';
    const iparamJSONFile = projDir.name + '/config/iparams.json';

    fs.copySync(validIparamFile, iparamJSONFile);
    expect([]).eql(configDirValidator.validate());

    const validIparamTestFile = __dirname + '/../test-res/iparam/valid_iparam_test_data.json';
    const iparamJSONTestFile = projDir.name + '/config/iparam_test_data.json';

    fs.copySync(validIparamTestFile, iparamJSONTestFile);
    expect([]).eql(configDirValidator.validate());

    const validOauthFile = __dirname + '/../test-res/iparam/valid_iparam.json';
    const oauthJSONFile = projDir.name + '/config/oauth_config.json';

    fs.copySync(validOauthFile, oauthJSONFile);
    expect([]).eql(configDirValidator.validate());

    const validHtmlFile = __dirname + '/../test-res/iparam/iparams.html';
    const htmlFile = projDir.name + '/config/iparams.html';

    fs.copySync(validHtmlFile, htmlFile);
    expect([]).eql(configDirValidator.validate());
    done();
  });

  it('should fail when other than json/html available', (done) => {
    const validIparamFile = __dirname + '/../test-res/iparam/valid_iparam.json';
    const destIparamFile = projDir.name + '/config/invalid_iparam_file_type.txt';

    fs.copySync(validIparamFile, destIparamFile);
    expect(['Config directory has invalid file(s) - invalid_iparam_file_type.txt']).eql(configDirValidator.validate());
    done();
  });

});
