'use strict';

const debuglog = __debug.bind(null, __filename);

const { isEmpty } = require('lodash');
const crypto = require('crypto');
const npm = require('npm');
const manifest = require('../manifest');

const DataStore = require('./data-util').DataStore;
const nsUtil = require('./file-util').nsresolver;
const manifestValidation = require('../validations/manifest-dependency-validation');

const storage = new DataStore({});

// Used to check if dependencies has modification
var dpnHash = crypto.createHash('md5').update(JSON.stringify(manifest.dependencies)).digest('hex');

function installDependency(dependencies, callback) {
  const installPath = `${process.cwd()}/server`;
  const dpnArr = [];

  npm.load({
    loaded: false,
    loglevel: 'silent',
    depth: 0,
    progress: false,
    prefix: installPath
  }, (error) => {
    if (error) {
      return callback(error.message);
    }

    //check for the versions before installing.
    npm.commands.ls(Object.keys(dependencies), true, (err, data, list) => {
      if (err) {
        return callback(err.message);
      }
      const installedDependencies = list.dependencies || {};

      for (const dpn in dependencies) {
        if (!installedDependencies[dpn] ||
          (dependencies[dpn] !== installedDependencies[dpn].version)) {
          dpnArr.push(`${dpn}@${dependencies[dpn]}`);
        }
      }
      if (dpnArr.length === 0) {
        debuglog('No dependencies to be installed.');
        return callback(null);
      }
      debuglog(`Preparing to install ${dpnArr}`);
      console.log('Installing dependencies...');

      npm.commands.install(installPath, dpnArr, (error) => {
        if (error) {
          return callback(error.message);
        }
        console.log('### Installation succeeded ###');
        callback(null);
      });
    });
  });
}

function validateDependencies(callback) {
  const dependencyErr = manifestValidation.validateDependencies();

  storage.store(nsUtil.getInternalNamespace('dpn_hash'), dpnHash);
  if (!(isEmpty(dependencyErr))) {
    return callback(dependencyErr);
  }
}
function run(callback) {
  /*
    Run the validation only if the dependencies are modified
  */
  if (storage.fetch(nsUtil.getInternalNamespace('dpn_hash')) !== dpnHash) {
    validateDependencies(callback);
  }
  const dependencies = manifest.dependencies;

  if (isEmpty(dependencies)) {
    console.log('### No dependencies to install ###');
    return callback(null);
  }
  installDependency(dependencies, callback);
}

module.exports = {
  run
};
