'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('omni validate', ()=> {
  let projDir, mf, mfValidate, oauthvalidate;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    mf = require(__dirname + '/../lib/manifest');
    mfValidate = require(__dirname +
          '/../lib/validations/manifest-validation');
    oauthvalidate = require(__dirname +
            '/../lib/validations/oauth-validation');
  });

  it('should fail - Invalid product', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_invalid_omni.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid_omni.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    const validationErrors = mfValidate.validate();

    expect(validationErrors).to.include('Invalid product(s) mentioned for building omni apps in manifest.json: Freskdesk not supported');

    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();

  });

  it('should fail - Oauth not valid for omni apps', (done) => {
    const validOauthConfigFile = __dirname + '/../test-res/iparam/oauth_config.json';
    const oauthConfigFile = projDir.name + '/config/oauth_config.json';
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_valid_omni.json';
    const destmfFile = projDir + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    fs.copySync(validOauthConfigFile, oauthConfigFile);
    mf.reload();

    const validationErrors = oauthvalidate.validate();

    expect(validationErrors).to.include('oauth_config.json - oauth Iparams app not supported in omni apps');

    fs.unlinkSync(oauthConfigFile);
    done();
  });

});