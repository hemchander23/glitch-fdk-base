'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');

const appClassifier = require('../utils/app-util').appClassifier;
const validators = require('../validations/');

async function run(validationType, skipValidation = '', fix) {
  skipValidation = skipValidation.split(',');

  debuglog(`asked to skip the following validations, ${skipValidation}`);

  const appType = appClassifier();

  const validations = validators.map(validator => {
    if (
      !validator.validationType.includes(validationType) ||
      skipValidation.includes(validator.name)
    ) {
      debuglog(`skipping validator ${validator.name}`);
      return;
    }

    debuglog(`running validator ${validator.name}`);

    return validator.validate(appType, fix);
  });

  const errorMessages = await Promise.all(validations);

  return _.compact(_.flattenDeep(errorMessages));
}

module.exports = {
  run
};
