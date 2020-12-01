'use strict';

const _ = require('lodash');
const syncRequest = require('sync-request');

const validationConst = require('./constants').validationContants;
const httpUtil = require('../utils/http-util');
const manifest = require('../manifest');

function validateDependencies() {
  const err = [];

  for (const i in manifest.dependencies) {
    const registryResponse = syncRequest('GET', `http://registry.npmjs.org/${i}`);

    if (registryResponse.statusCode === httpUtil.status.not_found) {
      err.push(`Unknown dependency mentioned in manifest.json: ${i}.`);
    }
    else {
      const availableVersions = _.keys(JSON.parse(registryResponse.body).versions);
      let version = String(manifest.dependencies[i]);

      if (version.startsWith('^') || version.startsWith('~')) {
        err.push(`Package '${i}' version contains special characters(^ or ~).`);
        version = version.slice(1);
      }
      if (!(_.includes(availableVersions, version))) {
        err.push(`Package ${i} does not have version ${manifest.dependencies[i]}.`);
      }
    }
  }
  return err;
}

module.exports = {
  name: 'manifest-dependency',

  validate() {
    const errMsgs = [];
    const dependencyErr = validateDependencies();

    const hasDependencies = Object.keys(manifest.dependencies).length !== 0;

    if (hasDependencies && !manifest.features.includes('backend')) {
      return [ 'Please remove dependencies from your manifest as the current app does not have a serverless component.' ];
    }

    if (!(_.isUndefined(dependencyErr))) {
      errMsgs.push(dependencyErr);
    }
    return _.flattenDeep(errMsgs);
  },

  validateDependencies,

  validationType: [ validationConst.PRE_PKG_VALIDATION ]
};
