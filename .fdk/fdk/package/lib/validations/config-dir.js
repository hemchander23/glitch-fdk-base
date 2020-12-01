'use strict';

const debuglog = __debug.bind(null, __filename);

const fileUtil = require('../utils/file-util');
const validationConst = require('./constants').validationContants;

const validFileFolders = [
  'iparams.html',
  'iparams.json',
  'iparam_test_data.json',
  'oauth_config.json',
  'assets',
  'entities.json'
];

const IPARAM_TEST_DATA = 'iparam_test_data.json';
const WARNING = 1;

module.exports = {
  name: 'config-dir',

  validate() {
    const errMsgs = [];
    const configFolderPath = `${process.cwd()}/config/`;

    debuglog(`Checking to see if ${configFolderPath} exists.`);

    if (fileUtil.fileExists(configFolderPath)) {
      const configFiles = fileUtil.readDir(configFolderPath).filter(fileUtil.removeJunkFiles);

      debuglog(`Fetched the following config files ${configFiles}`);

      const invalidConfigFiles = configFiles.filter(file => !validFileFolders.includes(file));

      if (invalidConfigFiles.length > 0) {
        errMsgs.push(`Config directory has invalid file(s) - ${invalidConfigFiles}`);
      }

      if (configFiles.includes(IPARAM_TEST_DATA)) {
        errMsgs.push({
          severity: WARNING,
          value: 'iparam_test_data.json is deprecated, to test the installation page, visit - http://localhost:10001/custom_configs'
        });
      }
    }

    return errMsgs;
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
