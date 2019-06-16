'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('manifest validate', () => {

  let projDir, mf, mfValidate, mfDependencyValidate;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    mf = require(__dirname + '/../lib/manifest');
    mfValidate = require(__dirname+
      '/../lib/validations/manifest-validation');
    mfDependencyValidate = require(__dirname +
      '/../lib/validations/manifest-dependency-validation');
  });

  it('should fail - redundant dependency', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_invalid_dependency.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfDependencyValidate.validate()[0]).eql('Please remove dependencies from your manifest as the current app does not have a serverless component.');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - invalid dependency', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_invalid_dependency.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';
    const destServerFile = `${projDir.name}/server/server.js`;
    const srcServerFile = `${__dirname}/../test-res/backend_server.js`;

    fs.copySync(srcServerFile, destServerFile);

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfDependencyValidate.validate()[0]).eql('Unknown dependency mentioned in manifest.json: abcxrt.');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - url is empty', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_no_url.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Url is either not mentioned or empty in freshdesk/ticket_sidebar');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - url is not in appfolder', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_missing_template.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Template file \'abc.html\' mentioned in freshdesk/ticket_sidebar is not found in app folder');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - icon is empty', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_no_icon.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Icon is either not mentioned or empty in freshdesk/ticket_sidebar');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - icon is not in appfolder', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_missing_icon.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Icon \'logo.jpg\' mentioned in freshdesk/ticket_sidebar is not found in app folder');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - invalid icon dimensions', (done) => {
    const srcmfFile = __dirname + '/../test-res/logo_test.png';
    const validsrcmFile = __dirname + '/../test-res/logo.png';
    const destmfFile = projDir.name + '/app/logo.png';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Invalid dimension of icon \'logo.png\' for freshdesk/ticket_sidebar');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - product is empty', (done) => {
    const srcmfFile = __dirname + '/../test-res/manifest/manifest_no_product.json';
    const validsrcmFile = __dirname + '/../test-res/manifest/manifest_valid.json';
    const destmfFile = projDir.name + '/manifest.json';

    fs.copySync(srcmfFile, destmfFile);
    mf.reload();
    expect(mfValidate.validate()[0]).eql('Atleast one product must be mentioned in manifest.json');
    fs.copySync(validsrcmFile, destmfFile);
    mf.reload();
    done();
  });

  it('should fail - manifest not found', (done) => {
    const manifestFile = projDir.name + '/manifest.json';

    fs.unlinkSync(manifestFile);
    mf.reload();
    done();
  });

  it('should fail - unable to parse manifest', (done) => {
    const manifestFile = projDir.name + '/manifest.json';

    fs.writeFileSync(manifestFile, 'sometext');
    mf.reload();
    done();
  });
});
