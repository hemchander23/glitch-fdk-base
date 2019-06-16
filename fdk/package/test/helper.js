'use strict';

const fs = require('fs-extra');
const passportOauth = require('passport-oauth2');
const passport = require('passport');
const passportRefresh = require('passport-oauth2-refresh');
const process = require('process');
const os = require('os');
const sinon = require('sinon');
const inquirer = require('inquirer');
const stub = require('./stub');

/*eslint-disable */
global.shouldCallbackOAuthInit = true;
global.FDK_PATH = process.cwd();
global.APP_SOURCE = 'APP';

global.nukeCache = () => {
  Object.keys(require.cache).forEach((p) => {
    if (p.startsWith(`${global.FDK_PATH}/lib`)) {
      delete require.cache[p];
    }
  });
}

const express = require('express');
require.cache[require.resolve('express')].exports.response.render = function(a, b, c) {
  this.send();
};


fs.remove(`${os.homedir()}/.fdk`);

require('../lib/utils/debugger.js');

sinon.stub(passportOauth, 'Strategy').callsFake((options, callback) => {
  global.strategyOptions = options;
  if (shouldCallbackOAuthInit) {
    callback('abcdefghij', 'abcdefghij');
  }
});
/*eslint-enable */

sinon.stub(passport, 'authenticate').callsFake(() => {
  return (a, b, c) => { c();};
});

sinon.stub(passport, 'use').callsFake(() => {
  return (a, b, c) => { c(); };
});

sinon.stub(passportRefresh, 'use').callsFake(() => {
  return (a, b, c) => { c(); };
});

sinon.stub(passportRefresh, 'requestNewAccessToken').callsFake((a, b, c) => {
  c(null, 'abcdefghij', 'abcdefghij');
});

sinon.stub(process, 'exit').callsFake(() => {});

sinon.stub(inquirer, 'prompt').callsFake(() => {
  return Promise.resolve({
    template: 'your_first_serverless_app'
  });
});

describe('Run updater at first to fetch addon', function() {

  it('Fetch addon', function(done) {
    require('../lib/updater').checkForUpdate(function(err) {
      if (err) {
        console.log(err);
        process.exit(1);
      }
      done();
    });
  });
});

stub.stubModule('nodetree', () => {});
