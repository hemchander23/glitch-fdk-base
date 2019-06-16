'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const tmp = require('tmp');
const WebSocket = require('websocket').w3cwebsocket;

const DataStore = require('../lib/utils/data-store');
const cliHelp = require('../lib/cli/help');
const httpUtil = require('../lib/utils/http-util');
const pjson = require('../package.json');
const stub = require('./stub');
const updater = require('../lib/updater');
const versionInfo = require('../lib/cli/version');

const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});

global.pjson = pjson;

describe('Cli init', () => {

  let cliInit;

  before((done) => {
    cliInit = require('../lib/cli/init');
    done();
  });

  it('initialize template', (done) => {
    const projDir = tmp.dirSync({prefix: 'freshapps_sdk'});

    cliInit.run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    done();
  });

  /**
  * If the product has only one template and if template is not provided
  * consider the single template as default
  */
  it('initialize template - default template', (done) => {
    const projDir = tmp.dirSync({prefix: 'freshapps_sdk'});

    cliInit.run(projDir.name, null, 'freshsales');
    done();
  });

  it('initialize template - assume freshdesk as default', (done) => {
    const projDir = tmp.dirSync({prefix: 'freshapps_sdk'});

    cliInit.run(projDir.name, 'your_first_serverless_app', 'freshdesk');
    done();
  });

  it('invalid product', (done) => {
    cliInit.run('/tmp/', 'your_first_serverless', 'noproduct');
    done();
  });

  it('invalid template', (done) => {
    cliInit.run('/tmp/', 'notemplate', 'freshdesk');
    done();
  });

  it('no template (go for prompt)', (done) => {
    const projDir = tmp.dirSync({prefix: 'freshapps_sdk'});

    cliInit.run(projDir.name, null, 'freshdesk');
    done();
  });
});

describe('Cli run', () => {
  let projDir, server;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
  });

  beforeEach( () => {
    server = require('../lib/cli/run').run(true, true);
  });

  afterEach( () => {
    server.close();
  });

  it('expects 200 for iframe api', (done) => {
    request(server)
      .get('/iframe/api')
      .expect(httpUtil.status.ok, done);
  });

  it('expects 200 for iframe api v2', (done) => {
    request(server)
      .get('/iframe/api/v2')
      .expect(httpUtil.status.ok, done);
  });

  it('Get html content (via /iframe static route)', (done) => {
    request(server)
      .get('/iframe/template.html')
      .end((err, res) => {
        expect(err).to.eql(null);
        expect(res.status).to.eql(httpUtil.status.ok);
        done();
      });
  });

  it('Get js content (via /iframe static route)', (done) => {
    request(server)
      .get('/iframe/app.js')
      .end((err, res) => {
        expect(err).to.eql(null);
        expect(res.status).to.eql(httpUtil.status.ok);
        done();
      });
  });

  it.skip('check if app content changes are pushed through websocket', (done) => {
    const ws = new WebSocket('ws://localhost:10001/notify-change');

    ws.onmessage = (e)=> {
      expect(e.data).to.eql('{"file":"template.html"}');
      ws.close();
      done();
    };
    fs.writeFileSync(`${projDir.name}/app/template.html`, 'dummy data');
  });

  it('print version', function testSlash(done) {
    versionInfo.run();
    done();
  });

  it('check if manifest is reloaded on change', (done) => {
    const mf = require('../lib/manifest');
    const WRITE_TIMEOUT = 1000;
    const modifiedManifest = JSON.parse(fs.readFileSync(`${projDir.name}/manifest.json`));

    modifiedManifest['platform-version'] = '3.0';
    const ws = new WebSocket('ws://localhost:10001/notify-change');

    ws.onmessage = (e)=> {
      expect(e.data).to.eql('{"file":"manifest.json"}');
      expect(mf.pfVersion).to.eql('3.0');
      ws.close();
      done();
    };
    setTimeout(() => {
      fs.writeFileSync(`${projDir.name}/manifest.json`, JSON.stringify(modifiedManifest));
    }, WRITE_TIMEOUT);
  });

});

describe('Cli version', () => {

  it('Unable to fetch from remote', (done) => {
    stub.stubModule('request', (options, fn) => {
      fn({code: 'ENOTFOUND'});
    });
    require('../lib/cli/version').run();
    stub.releaseStub('request');
    stub.releaseStub('../lib/cli/version');
    done();
  });

  it('Already up to date', (done) => {
    stub.stubModule('request', (options, fn) => {
      fn(null, null, JSON.stringify({
        fdkCli: {
          version: pjson.version
        }
      }));
    });
    require('../lib/cli/version').run();
    stub.releaseStub('request');
    stub.releaseStub('../lib/cli/version');
    done();
  });

  it('New version available', (done) => {
    stub.stubModule('request', (options, fn) => {
      fn(null, null, JSON.stringify({
        fdkCli: {
          version: '100.100.100'
        }
      }));
    });
    require('../lib/cli/version').run();
    stub.releaseStub('request');
    stub.releaseStub('../lib/cli/version');
    done();
  });

});

describe('Cli help', () => {

  it('print help', (done) => {
    cliHelp.printHelp('run');
    done();
  });

  it('check for update', function (done) {
    updater.checkForUpdate(function() {
      expect(typeof dbApi.fetch('version_details')).to.eql('object');
      done();
    });
  });

  // TODO: Enable this test case when forced version is enabled.
  // it('check for forced version', function (done) {
  //   dbApi.store('version_details', {
  //     forced_versions: ['100.100.100']
  //   });
  //   updater.checkForUpdate(function(err) {
  //     expect(err).to.eql('Current version of FDK is deprecated. Please update to 100.100.100 to continue development.');
  //     done();
  //   });
  //   dbApi.store('version_details', undefined);
  // });

});

describe('Cli pack', () => {
  it('pack serverless app', (done) => {
    const projDir = tmp.dirSync({prefix: 'serverless'});
    const ns = require(__dirname + '/../lib/utils/ns-resolver');

    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require('../lib/manifest').reload();

    fs.watch(projDir.name, { persistent: false, recursive: true }, (event, filename) => {
      if (event === 'rename' && filename === `dist/${ns.getRootFolder()}.zip`) {
        done();
      }
    });

    require(__dirname + '/../lib/cli/pack').run();
  });

  it('pack frontend app', (done) => {
    const projDir = tmp.dirSync({prefix: 'frontend'});

    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_serverless_app', 'freshdesk');

    process.chdir(projDir.name);
    require('../lib/manifest').reload();

    /*
    * cli/pack holds previous buffer at global context, clearing it
    */
    delete require.cache[require.resolve(__dirname + '/../lib/cli/pack')];

    fs.writeFileSync('./.report.json', 'report');

    const ns = require(__dirname + '/../lib/utils/ns-resolver');

    fs.watch(projDir.name, { persistent: false, recursive: true }, (event, filename) => {
      if (event === 'rename' && filename === `dist/${ns.getRootFolder()}.zip`) {
        done();
      }
    });

    require(__dirname + '/../lib/cli/pack').run();
    // setTimeout(() => {

    // }, ZIP_CREATION_BUFFER_TIME);
  });
});
