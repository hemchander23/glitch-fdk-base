'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('Workflow custom actions test', () => {

  let projDir, mf, actionValidate, actionSchemaValidate;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);

    const validServerFile = __dirname + '/../test-res/backend_actions_server.js';
    const destServerFile = projDir.name +'/server/server.js';

    fs.copySync(validServerFile, destServerFile);

    const destactFile = projDir.name + '/actions.json';
    const validsrcactFile = __dirname + '/../test-res/manifest/actions_valid.json';

    fs.copySync(validsrcactFile, destactFile);

    require(__dirname + '/../lib/manifest').reload();
    mf = require(__dirname + '/../lib/manifest');
    actionValidate = require(__dirname+
      '/../lib/validations/actions-validation.js');
    actionSchemaValidate = require(__dirname +
      '/../lib/validations/schema-validation.js');

  });

  it('Should fail if action field is missing', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_missing_field.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionValidate.validate()[0]).to.match(/^Key(.+)is not defined for action (.+)/);
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('Should fail if field value is null', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_missing_action_value.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionValidate.validate()[0]).to
      .match(/^Value for (.+) is empty, it is mandatory field/);
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('Should fail if request has $ref', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_schema_with_ref.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionValidate.validate()[0]).to
      .match(/^Ref tags are not suuported in current version./);
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('Should fail if schema is invalid', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_invalid_actions.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionSchemaValidate.validate()[0]).to.contain('data.properties should be object');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('Should validate if valid actions', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_valid_actions.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionValidate.validate()).eql([]);
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('Should fail if action is not defined', (done) => {
    const srcServerFile = __dirname + '/../test-res/backend_nodef_actions.js';
    const validServerFile = __dirname + '/../test-res/backend_actions_server.js';
    const destServerFile = projDir.name +'/server/server.js';

    fs.copySync(srcServerFile, destServerFile);
    mf.reload();
    expect(actionValidate.validate()[0])
      .to.contain('testAction2 does not have definition in server.js');
    fs.copySync(validServerFile, destServerFile);
    mf.reload();
    done();
  });

  it('Should validate data with action Name given', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/actions_valid_actions.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    const destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(actionSchemaValidate.validateSingleAction('testAction', {'checked': true}, 'request')).eql('');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

});
