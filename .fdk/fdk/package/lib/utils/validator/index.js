'use strict';

const debuglog = __debug.bind(null, __filename);

const Ajv = require('ajv');

const schema = require('./schema');

const { keywords } = require('./keyword.js');

const { ValidationError } = require('../error-util');

const ajv = new Ajv({
  async: true,
  allErrors: true,
  useDefaults: true,
  jsonPointers: true
});

require('ajv-keywords')(ajv, ['uniqueItemProperties']);

Object.keys(keywords).forEach(keyword => {
  ajv.addKeyword(keyword, keywords[keyword]);
});

/**
 * Returns validator instance for the given JSON schema
 *
 * @param  {object} schema - JSON schema to validate
 * @returns {AJV} Validator instance for the given schema
 */
function createValidator(schema) {
  return ajv.compile(schema);
}

const validators = Object.keys(schema).reduce((validators, route) => {
  const actionValidators = Object.keys(schema[route]).reduce((actionValidators, action) => {
    return {
      ...actionValidators,
      [action]: createValidator(schema[route][action])
    };
  }, {});

  return {
    ...validators,
    [route]: actionValidators
  };
}, {});

async function validate(resource, action, data) {
  try {
    const validator = validators[resource][action];

    await validator(data);
  }
  catch (error) {
    debuglog(`error where executing ajv validations ${JSON.stringify(error.errors)}`);

    throw new ValidationError('validation failed', {
      errors: error.errors
    });
  }
}

module.exports = {
  validate,
  validators
};
