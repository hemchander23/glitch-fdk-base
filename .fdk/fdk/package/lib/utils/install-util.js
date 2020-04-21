'use strict';

const path = require('path');
const { promisify } = require('util');

const debuglog = __debug.bind(null, __filename);

const { isEmpty } = require('lodash');
const npm = require('npm');

const promisifiedNPMLoad = promisify(npm.load),
      promisifiedNPMInstall = promisify((...args) => {
        npm.commands.install(...args);
      });

const errorUtil = require('./error-util.js');

async function installDependency(dependencies, folder = 'server') {
  const installPath = path.join(process.cwd(), folder);

  dependencies = Object.entries(dependencies).map(entry => `${entry[0]}@${entry[1]}`);

  await promisifiedNPMLoad({
    loaded: false,
    loglevel: 'silent',
    depth: 0,
    progress: false,
    prefix: installPath
  });

  debuglog(`Preparing to install the following dependencies ${dependencies}`);
  console.log('Installing dependencies...');

  await promisifiedNPMInstall(installPath, dependencies);
}

async function run(dependencies, folder) {
  debuglog(`dependency installer called with ${JSON.stringify(dependencies)}`);

  if (isEmpty(dependencies)) {
    return;
  }

  try {
    await installDependency(dependencies, folder);
  }
  catch (error) {
    errorUtil.printError('Error while installing dependencies', [
      error.message
    ]);
  }
}

module.exports = {
  run
};
