'use strict';

const _ = require('lodash');

const validationConst = require('./constants').validationContants;
const fileUtil = require('../utils/file-util');

// size in bytes. 2000000 bytes = 2 MB.
const MAX_INDVL_ASSET_SIZE = 2000000;

module.exports = {
  name: 'app-dir',

  validate(appType) {
    const errMsgs = [];
    const appFolderPath = `${process.cwd()}/app/`;

    if (_.includes(appType, 'purebackend')) {
      return;
    }
    if (fileUtil.fileExists(appFolderPath)) {
      let appFiles = fileUtil.readDir(appFolderPath);

      appFiles = appFiles.filter(fileUtil.removeJunkFiles);

      for (const i in appFiles) {
        const filePath = appFolderPath + appFiles[i];
        const fileStat = fileUtil.statFile(filePath);

        //Asset size check
        if (fileStat.size > MAX_INDVL_ASSET_SIZE) {
          errMsgs.push(`App file exceeds threshold size(2MB): app/${appFiles[i]}`);
        }
      }
    }
    else {
      errMsgs.push('Mandatory folder(s) missing: app');
    }
    return errMsgs;
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
