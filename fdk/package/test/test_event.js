'use strict';

const expect = require('chai').expect;
const tmp = require('tmp');
const fs = require('fs-extra');

describe('Bknd event tests', () => {

  let projDir, eventValidator;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
    eventValidator = require('../lib/validations/event-validation');
  });

  it('should validate bknd events', (done) => {
    expect([]).eql(eventValidator.validate());
    done();
  });

  it('should fail', (done) => {
    const invalidServerEventFile = __dirname + '/../test-res/server_invalid_event.js';
    const serverFile = projDir.name + '/server/server.js';

    fs.copySync(invalidServerEventFile, serverFile);
    expect(eventValidator.validate()).eql(['Invalid event: \'testEvent\'']);
    done();
  });
});