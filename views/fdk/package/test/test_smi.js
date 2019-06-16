'use strict';

const tmp = require('tmp');
const fs = require('fs-extra');
const request = require('supertest');
const expect = require('chai').expect;

const httpUtil = require('../lib/utils/http-util');

describe('SMI Test', () => {
  let server, projDir, payload, headers;

  before(() => {
    nukeCache();
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
    payload = {
      methodName: 'callRemote',
      methodParams: { url: 'https://www.google.co.in' },
      action: 'invoke',
      data: {
        isInstall: false
      }
    };
    headers = {
      'content-type': 'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'smi'
    };
  });

  afterEach(() => {
    server.close();
  });

  it ('should invoke the function in the server script', (done) => {
    const destFile = `${projDir.name}/server/server.js`;
    const srcFile = `${__dirname}/../test-res/backend_server.js`;

    fs.copySync(srcFile, destFile);
    server = require(__dirname + '/../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send(payload)
      .set(headers)
      .expect(httpUtil.status.ok, done);
  });

  it.skip ('should throw error while using DB object from custom installtion page', (done) => {
    const destFile = `${projDir.name}/server/server.js`;
    const srcFile = `${__dirname}/../test-res/backend_server.js`;

    const payload = {
      methodName: 'smiCustomInstall',
      methodParams: {},
      action: 'invoke',
      data: {
        isInstall: true
      }
    };

    fs.copySync(srcFile, destFile);
    server = require(__dirname + '/../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send(payload)
      .set(headers)
      .expect(httpUtil.status.ok, (error, resp) => {
        const response = resp.body;

        expect(response.status).to.equal(httpUtil.status.internal_server_error);
        expect(response.message).eql('Error while executing App server script! - $db is not defined');
        done();
      });
  });

  it ('should invoke the function in the server script from custom installtion page', (done) => {
    const destFile = `${projDir.name}/server/server.js`;
    const srcFile = `${__dirname}/../test-res/backend_server.js`;

    const payload = {
      methodName: 'callRemote',
      methodParams: { url: 'https://www.google.co.in' },
      action: 'invoke',
      data: {
        isInstall: true
      }
    };

    fs.copySync(srcFile, destFile);
    server = require(__dirname + '/../lib/cli/run').run();
    request(server)
      .post('/dprouter')
      .send(payload)
      .set(headers)
      .expect(httpUtil.status.ok, done);
  });
});
