'use strict';

const fs = require('fs-extra');
const tmp = require('tmp');
const expect = require('chai').expect;

describe('test install', () => {
  var projDir, dependencyInstaller, manifest;

  before(() => {
    nukeCache();
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    process.chdir(projDir.name);
    dependencyInstaller = require(`${__dirname}/../lib/utils/install`);
    manifest = require(`${__dirname}/../lib/manifest`);
  });

  it ('should successfully return when no dependencies present', (done) => {
    manifest.reload();
    dependencyInstaller.run((err) => {
      expect(err).eql(null);
      done();
    });
  });

  it ('should successfully install the dependencies when present', (done) => {
    const destManifestFile = `${projDir.name}/manifest.json`;
    const srcManifestFile = `${__dirname}/../test-res/manifest/manifest_valid_dependency.json`;

    fs.copySync(srcManifestFile, destManifestFile);
    manifest.reload();
    dependencyInstaller.run(() => {
      const serverDirs = fs.readdirSync(`${projDir.name}/server`);

      expect(serverDirs).to.include('node_modules');
      const modules = fs.readdirSync(`${projDir.name}/server/node_modules`);

      expect(modules).to.include('fs-extra');
      done();
    });
  });

  it ('should install if a new npm dependency is added', (done) => {
    const destManifestFile = `${projDir.name}/manifest.json`;
    const srcManifestFile = `${__dirname}/../test-res/manifest/manifest_new_dependency.json`;

    fs.copySync(srcManifestFile, destManifestFile);
    manifest.reload();
    dependencyInstaller.run(() => {
      const modules = fs.readdirSync(`${projDir.name}/server/node_modules`);

      expect(modules).to.include('request');
      done();
    });
  });

});