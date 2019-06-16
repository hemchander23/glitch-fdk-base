'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('ack test', () => {
  let projDir;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    var testServerFile = __dirname + '/../test-res/backend_excess_dep.js';
    var serverFile = projDir.name + '/server/server.js';
    var srcManifestFile = __dirname + '/../test-res/manifest/manifest_excess_dep.json';
    var manifestFile = projDir.name + '/manifest.json';

    fs.copySync(srcManifestFile, manifestFile);
    require(__dirname + '/../lib/manifest').reload();
    fs.copySync(testServerFile, serverFile);
    delete require.cache;
    fs.writeFileSync(projDir.name + '/.report.json', JSON.stringify({}));
  });

  it('catch unlisted and unused dependencies in manifest', function testSlash(done) {
    expect(require('../lib/validations/lint-validation.js').validate()).eql([{
      severity: 2,
      value: 'server/server.js::1: The following dependencies are not used: needle'
    }, {
      severity: 2,
      value: 'server/server.js::1: \'request\' is not listed in manifest.'
    }, {
      severity: 2,
      value: 'server/server.js::1: \'loadDependency\' will soon be deprecated. Please use \'require\''
    }]);
    done();
  });
});
