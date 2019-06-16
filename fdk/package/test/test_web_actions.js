'use strict';

const fs = require('fs-extra');
const nodeFs = require('fs');
const request = require('supertest');
const tmp = require('tmp');

const httpUtil = require('../lib/utils/http-util');

describe('Web actions test', () => {
  let projDir, server, mf;
  let srcmfFile, validsrcmFile, destmfFile;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');

    const destactFile = projDir.name + '/actions.json';
    const validsrcactFile = __dirname + '/../test-res/manifest/actions_valid.json';

    fs.copySync(validsrcactFile, destactFile);

    process.chdir(projDir.name);
    mf = require(__dirname + '/../lib/manifest');

    srcmfFile = __dirname + '/../test-res/manifest/actions_valid_actions.json';
    validsrcmFile = __dirname + '/../test-res/manifest/actions_valid.json';
    destmfFile = projDir.name + '/actions.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();

    const testServerFile = __dirname + '/../test-res/backend_actions_server.js';
    const serverFile = projDir.name + '/server/server.js';

    require(__dirname + '/../lib/manifest').reload();
    fs.copySync(testServerFile, serverFile);
    delete require.cache;
    server = require('../lib/cli/run').run();
  });

  after(() => {
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    server.close();
  });

  it('should get Actions Data - testAction', (done) => {
    request(server)
      .get('/web/actions/testAction')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should get Action Data - testAction', (done) => {
    nodeFs.writeFileSync(projDir.name + '/server/test_data/testAction.json', '{"checked": true}');
    request(server)
      .get('/web/actions/testAction')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should get testing page - testAction', (done) => {
    request(server)
      .get('/web/test')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should fail storing actions page for empty value - testAction', (done) => {
    request(server)
      .post('/web/actions/testAction')
      .send({})
      .expect(httpUtil.status.bad_request, done);
  });

  it('should store actions  - testAction', (done) => {
    request(server)
      .post('/web/actions/testAction')
      .send({'checked': true})
      .expect(httpUtil.status.ok, done);
  });

  it('should reset actions Data - testAction', (done) => {
    request(server)
      .post('/web/actions/reset/testAction')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('Should succeed if valid response', (done) => {
    request(server)
      .post('/web/validateAction/testAction')
      .send({'success': false, 'error': 'Test Error'})
      .expect(httpUtil.status.ok, done);
  });

  it('Should get list of actions', (done) => {
    request(server)
      .get('/web/actionsList')
      .expect(httpUtil.status.ok, done);
  });

  it('should get 404 actions page', (done) => {
    fs.removeSync(projDir.name + '/server/server.js');
    require(__dirname + '/../lib/manifest').reload();
    request(server)
      .get('/web/test')
      .send()
      .expect(httpUtil.status.ok, done);
  });
});
