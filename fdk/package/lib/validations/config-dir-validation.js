'use strict';

const debuglog = __debug.bind(null, __filename);

const fileUtil = require('../utils/file-util');
const validationConst = require('./constants').validationContants;

const validFileNames = [
  'iparams.html',
  'iparams.json',
  'iparam_test_data.json',
  'oauth_config.json'
];

module.exports = {
  validate() {
    const errMsgs = [];
    const configFolderPath = `${process.cwd()}/config/`;

    debuglog(`Checking to see if ${configFolderPath} exists.`);

    if (fileUtil.fileExists(configFolderPath)) {
      const configFiles = fileUtil.readDir(configFolderPath).filter(fileUtil.removeJunkFiles);

      debuglog(`Fetched the following config files ${configFiles}`);

      const invalidConfigFiles = configFiles.filter(file => !validFileNames.includes(file));

      if (invalidConfigFiles.length > 0) {
        errMsgs.push(`Config directory has invalid file(s) - ${invalidConfigFiles}`);
      }
    }

    return errMsgs;
  },

  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
