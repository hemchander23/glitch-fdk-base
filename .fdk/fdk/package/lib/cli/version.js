'use strict';

const debuglog = __debug.bind(null, __filename);

const request = require('request');

const packageJSON = require('../../package.json');
const helper = require('../utils/helper-util');

const VERSION_URL = 'https://ws.freshdev.io/cli/version.json';

module.exports = {
  run: function() {
    console.log(`Installed: ${packageJSON.version}`);

    //Perform API Call to the version management to get the latest version.
    request({
      url: VERSION_URL,
      method: 'GET'
    }, function(err, req, body) {
      if (err) {
        debuglog(`Error while checking for version ${err.message}`);

        if (err.code === 'ENOTFOUND') {
          console.log('Unable to contact remote server to fetch latest version. Please make sure you are connected to internet.');
          process.exit(1);
        }
      }
      try {
        const versionData = JSON.parse(body);

        if (packageJSON.version === versionData.fdkCli.version) {
          console.log('Already Up to Date..!');
        }
        if (helper.isGreaterThan(packageJSON.version, versionData.fdkCli.version)) {
          console.log(
            `Latest: ${versionData.fdkCli.version}\n` +
            `To install the latest version type '${versionData.fdkCli.cmd}'`
          );
        }
      }
      catch (e) {
        debuglog(`Error while checking for version ${e.message}`);
      }
    });
  }
};
