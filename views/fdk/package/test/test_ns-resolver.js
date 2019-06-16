'use strict';

const expect = require('chai').expect;
const tmp = require('tmp');

describe('Name space resolver test', ()=> {

  let projDir;

  before(()=> {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
  });

  it('should get app_id', (done) => {
    const ns = require(__dirname + '/../lib/utils/ns-resolver');

    expect('{"app_id":"fresha_101_101"}').eql(JSON.stringify(ns.getNamespace()));
    done();
  });
});
