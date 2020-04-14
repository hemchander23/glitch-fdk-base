'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');

const appClassifier = require('../utils/app-util').appClassifier;
const fileUtil = require('../utils/file-util');

module.exports = {
  run: function(validationType, skipValidation = '') {
    skipValidation = skipValidation.split(',');

    debuglog(`Asked to skip the following validations, ${skipValidation}`);

    const appType = appClassifier();
    const validationPath = __dirname + '/../validations/';
    const validationFiles = fileUtil.readDir(validationPath);
    const errMessage = [];

    validationFiles.forEach(file => {
      const validator = require(validationPath + file);

      if (_.includes(validator.validationType, validationType)) {
        if (skipValidation.includes(file.replace('-validation.js', ''))) {
          debuglog(`Skipping ${file}`);
          return;
        }

        debuglog(`Running ${file}`);

        errMessage.push(validator.validate(appType));
      }
    });

    return _.compact(_.flattenDeep(errMessage));
  }
};
