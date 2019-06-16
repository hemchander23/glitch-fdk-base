'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const nodeFs = require('fs');
const request = require('supertest');
const tmp = require('tmp');

const httpUtil = require('../lib/utils/http-util');

describe('Web event test', () => {
  let projDir, server;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    const testServerFile = __dirname + '/../test-res/backend_server.js';
    const serverFile = projDir.name + '/server/server.js';

    require(__dirname + '/../lib/manifest').reload();
    fs.copySync(testServerFile, serverFile);
    delete require.cache;
    server = require('../lib/cli/run').run();
  });

  after(() => {
    server.close();
  });

  it('should get Event Data - onTicketCreate', (done) => {
    request(server)
      .get('/web/events/onTicketCreate')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should get Event Data - onTicketCreate', (done) => {
    nodeFs.writeFileSync(projDir.name + '/server/test_data/onContactCreate.json', 'hello');
    request(server)
      .get('/web/events/onContactCreate')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('should store Event page - onTicketCreate', (done) => {
    request(server)
      .post('/web/events/onTicketCreate')
      .send({})
      .expect(httpUtil.status.ok, done);
  });

  it('should reset Event Data - onTicketCreate', (done) => {
    request(server)
      .post('/web/events/reset/onTicketCreate')
      .send()
      .expect(httpUtil.status.ok, done);
  });

  it('Fetch list of events for a product', (done) => {
    request(server)
      .get('/web/eventsList')
      .send()
      .expect(httpUtil.status.ok, (err, resp) => {
        if (err) {
          console.log(err);
        }
        expect(resp.body.events.length).to.not.eql(0);
        done();
      });
  });
});
