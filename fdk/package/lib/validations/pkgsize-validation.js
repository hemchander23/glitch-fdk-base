'use strict';

const debuglog = __debug.bind(null, __filename);

const nsUtil = require('../utils/ns-resolver');
const fileUtil = require('../utils/file-util');
const validationConst = require('./constants').validationContants;

const MAX_PKG_SIZE = 5000000;

module.exports = {
  validate() {
    const errMsgs = [];
    const plgDir = `${process.cwd()}/dist/${nsUtil.getRootFolder()}${nsUtil.pkgExt}`;
    const fileStat = fileUtil.statFile(plgDir);

    if (fileStat.size > MAX_PKG_SIZE) {
      debuglog(`File size ${fileStat.size} for file ${plgDir}`);
      errMsgs.push('Package size exceeds the 5MB limit.');
    }

    return errMsgs;
  },

  validationType: [validationConst.POST_PKG_VALIDATION]
};