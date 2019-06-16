'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const request = require('supertest');
const tmp = require('tmp');

const httpUtil = require('../lib/utils/http-util');

describe('BE-events test', () => {
  let projDir, server;

  before(() => {
    nukeCache();
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    const testServerFile = __dirname + '/../test-res/backend_server.js';
    const serverFile = projDir.name + '/server/server.js';

    require(__dirname + '/../lib/manifest').reload();
    fs.copySync(testServerFile, serverFile);
    fs.writeFileSync(projDir.name + '/.report.json', JSON.stringify({}));
    server = require('../lib/cli/run').run();
  });

  after(() => {
    server.close();
  });

  it('should succeed - call backend event(onTicketCreate)', (done) => {
    request(server)
      .post('/event/execute?name=onTicketCreate')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should succeed - call backend event(onAppInstall)', (done) => {
    request(server)
      .post('/event/execute?name=onAppInstall')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should succeed - call backend event(onAppUninstall)', (done) => {
    request(server)
      .post('/event/execute?name=onAppUninstall')
      .send()
      .end((err, res) => {
        expect(err).to.eql(null);
        expect(JSON.parse(res.text).message).to.eql('from app uninstall');
        expect(res.status).to.eql(httpUtil.status.internal_server_error);
        done();
      });
  });

  it('should fail - invalid event', (done) => {
    request(server)
      .post('/event/execute?name=abcdefghi')
      .send()
      .expect(httpUtil.status.bad_request, done);
  });
});
