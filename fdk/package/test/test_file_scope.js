'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const httpUtil = require('../lib/utils/http-util');
const request = require('supertest');
const tmp = require('tmp');

describe('Backend app file scope test', () => {
  let projDir, server;

  before(() => {
    nukeCache();
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
  });

  beforeEach(() => {
    const testServerFile = __dirname + '/../test-res/file_scope_server.js';
    const testLibFile = __dirname + '/../test-res/file_scope_lib.js';
    const serverFile = projDir.name + '/server/server.js';
    const libFile = projDir.name + '/server/lib/handle-response.js';

    fs.copySync(testServerFile, serverFile);
    fs.copySync(testLibFile, libFile);
  });

  afterEach(() => {
    server.close();
  });

  it ('should fail when local variable in  lib file used in server file', (done) => {
    const payload = {
      methodName: 'callRemote',
      methodParams: { url: 'https://www.google.co.in/#q=freshdesk', localVarTest: true },
      action: 'invoke',
      data: {
        isInstall: false
      }
    };
    const headers = {
      'content-type': 'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'smi'
    };

    server = require(__dirname + '/../lib/cli/run').run();

    request(server)
      .post('/dprouter')
      .send(payload)
      .set(headers)
      .expect(httpUtil.status.ok, (error, resp) => {
        const response = resp.body;

        expect(response.status).to.equal(httpUtil.status.internal_server_error);
        expect(response.message).eql('Error while executing App server script! - localVar is not defined');
        done();
      });
  });

  it ('should pass when global variable in lib file used in server file', (done) => {
    const payload = {
      methodName: 'callRemote',
      methodParams: { url: 'https://www.google.co.in/#q=freshdesk', globalVarTest: true },
      action: 'invoke',
      data: {
        isInstall: false
      }
    };
    const headers = {
      'content-type': 'application/json',
      'MKP-EXTNID': '101',
      'MKP-VERSIONID': '101',
      'MKP-ROUTE': 'smi'
    };

    server = require(__dirname + '/../lib/cli/run').run();

    request(server)
      .post('/dprouter')
      .send(payload)
      .set(headers)
      .expect(httpUtil.status.ok, (error, resp) => {
        const response = resp.body;

        expect(Object.keys(response)).to.deep.equal(['requestID']);
        done();
      });
  });
});
