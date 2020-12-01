'use strict';

const debuglog = __debug.bind(null, __filename);

const AdmZip = require('adm-zip');
const async = require('async');
const child_process = require('child_process');
const inquirer = require('inquirer');
const os = require('os');
const request = require('request');

const DataStore = require('./utils/data-util').DataStore;
const helper = require('./utils/helper-util');
const packageJSON = require('../package.json');

const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});

const TO_HOUR = 3600000;
const ONE_DAY = 24;
const VERSION_URL = 'https://ws.freshdev.io/cli/version.json';

function checkForUpdate(returnControlToIndex) {

  let localInfo, remoteInfo;

  async.waterfall([

    function checkForceUpdate(callback) {
      /**
        Fetch local version information from fdk store
      */
      localInfo = dbApi.fetch('version_details');

      // Disabled force check for now

      // if (localInfo && helper.isGreaterThan(packageJSON.version, localInfo.forced_versions.slice(-1).pop())) {
      //   return callback(`Current version of FDK is deprecated. Please update to ${localInfo.forced_versions.slice(-1).pop()} to continue development.`);
      // }
      callback();
    },

    function checkLastUpdated(callback) {

      /**
        Fetch last updated information from fdk store
      */
      const lastUpdated = dbApi.fetch('last_updated');

      /**
        if lastUpdated == undefined -> Perform update (missing, or new installation)
        if lastUpdated >= check limit - > Perform update (interval - 1hour has been crossed)
      */
      if (lastUpdated === undefined || (Date.now() - lastUpdated.time_stamp) / TO_HOUR > ONE_DAY) {
        debuglog('Checking for availability of new version of addon');
        return callback();
      }

      /**
        Cease update operation if conditions not met
      */
      debuglog('Check interval not met, skipping addon update');
      return returnControlToIndex();
    },

    function fetchVersionDetails(callback) {
      request({
        url: VERSION_URL
      }, (err, res, body) => {
        if (err) {
          return callback(err);
        }

        try {
          remoteInfo = JSON.parse(body);
        } catch (e) {
          return callback(`Error while fetching the version - ${e.message}`);
        }

        return callback();
      });
    },

    /**
      Notify user on availability of new FDK version and prompt to install
    */
    function notifyNewVersion(callback) {
      if (helper.isGreaterThan(packageJSON.version, remoteInfo.fdkCli.version)) {
        callback(null);
        inquirer.prompt({
          type: 'input',
          name: 'toUpdate',
          message: 'A new version of the Freshworks CLI is available, Would you like to install it now? (Yes/No)'
        }).then((ans) => {

          /**
            Re-ask if input is neither Yes nor No
          */
          ans.toUpdate = ans.toUpdate.toLowerCase();
          if (!ans.toUpdate.match(/^yes|no$/)) {
            return notifyNewVersion(callback);
          } else if (ans.toUpdate === 'yes') {
            try {
              // child_process.execSync(remoteInfo.fdkCli.cmd, {
              //   stdio: [0, 1, 2]
              // });
            } catch (e) {
              console.log(`Installation failed - ${e.message}`);
            }
          }
          return callback();
        });
      } else {
        return callback();
      }
    },

    function checkAddonVersion(callback) {

      /**
        if localInfo.addon.version == undefined -> Perform update (missing, or new installation)
        if localInfo.addon.version <= addon in remote - > Perform update (new version available)
      */
      if (localInfo === undefined ||
        helper.isGreaterThan(localInfo.addon.version, remoteInfo.addon.version)) {

        debuglog(`Found new version of addon - ${remoteInfo.addon.version}`);
        debuglog(`Updating local addon to - ${remoteInfo.addon.version}`);
        request({
          url: remoteInfo.addon.dl,
          encoding: null
        }, (err, res, body) => {
          if (err) {
            return callback(err);
          }
          /**
            Extract addon to fdk store location with version suffix
          */
          const zip = new AdmZip(body);

          zip.extractAllTo(`${os.homedir()}/.fdk/addon/addon-${remoteInfo.addon.version}`, true);

          return callback();
        });
      } else {
        debuglog(`Addon is already at the latest version - ${localInfo.addon.version}`);
        return callback();
      }
    }
  ], (err) => {

    if (err) {
      return returnControlToIndex(err);
    }

    /**
      Store the complete version information
    */
    dbApi.store('version_details', remoteInfo);

    /**
      Update last updated time to now (If Success)
    */
    dbApi.store('last_updated', {
      time_stamp: Date.now()
    });

    returnControlToIndex();
  });

}

module.exports = {
  checkForUpdate: checkForUpdate
};