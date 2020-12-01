/** @module lib/utils/validator/keyword */
'use strict';

const _ = require('lodash');

/**
 * Returns true if given data exists
 *
 * @param {object} schema - JSON schema with properties
 * @param {string} data - value to validate
 */
function hasSameKey(schema, data) {
  const keys = data.map(Object.keys);

  return keys.every((ele, index) => _.isEqual(keys[index], keys[index+1] || keys[index]));
}

/**
 * Returns true if given data exists
 *
 * @param {object} schema - JSON schema with properties
 * @param {string} data - value to validate
 * @param {object} objectSchema - JSON schema of the current object
 * @param {string} dataPath - dataPath of the current object
 * @param {object} parentData - parentData to validate
 */
function validateType(schema, data, objectSchema, dataPath, parentData) {
  return schema.allowedTypes.includes(parentData.type);
}

/**
 * Returns true if the filterable field count lesser to maxLimit
 *
 * @param {object} schema - JSON schema with properties
 * @param {string} data - value to validate
 */
function filterFieldLimit(schema, data) {
  return data.filter(field => field.filterable).length <= schema.maxLimit;
}

const keywords = {
  hasSameKey: {
    errors: 'full',
    validate: hasSameKey,
    type: 'array'
  },
  validateType: {
    errors: 'full',
    validate: validateType,
    type: 'boolean'
  },
  filterFieldLimit: {
    errors: 'full',
    validate: filterFieldLimit,
    type: 'array'
  }
};

module.exports = {
  keywords
};
