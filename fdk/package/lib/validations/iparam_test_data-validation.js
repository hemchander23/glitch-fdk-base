'use strict';

const _ = require('lodash');

const configUtil = require('../utils/config-util');
const validationConst = require('./constants').validationContants;
const fileUtil = require('../utils/file-util');

const TEST_DATA = 'Iparam test data';
const DEFAULT_VALUE = 'default_value';
const DEFAULT_REGEX = require('../utils/regex');
const TYPES_WITH_OPTIONS = [ 'dropdown', 'radio', 'multiselect' ];
const MULTISELECT = 'multiselect';
const TYPE = 'type';
const OPTIONS = 'options';
const ERROR_MESSAGES = {
  email: 'Please enter a valid email.',
  number: 'Please enter a valid number.',
  url: 'Please enter a valid URL.',
  phone_number: 'Please enter a valid phone_number. It should be a 10 digit number such as 1234567890 or 123-456-7890.',
  date: 'Please enter a valid date. It should be in the YYYY-MM-DD format.'
};

const VALID_REGEX_TYPES = [
  'text',
  'email',
  'phone_number',
  'number',
  'url'
];

function isReqField(attrs) {
  return (attrs.required === true);
}

function requiredValidation(jsonContent, testData) {
  const errMsgs = [];

  for (const field in jsonContent) {
    const attrs = jsonContent[field];

    if (isReqField(attrs) && !testData[field]) {
      errMsgs.push(`'${field}' is a required field.`);
    }
  }
  return errMsgs;
}

function isValidIparamTestData(regexKey, regexValue, value) {
  let regExp;

  if (regexKey.endsWith('-error')) {
    return true;
  }
  try {
    regExp = new RegExp(regexValue);
  }
  catch (e) {
    // already handled in iparam-validation.js.
    // to avoid duplication of messages, returning true.
    return true;
  }

  return regExp.test(value);
}

function validateDefaultRegex(key, value, attrs, fieldName) {
  const type = attrs.type;
  const errMsgs = [];
  const regex = DEFAULT_REGEX[type];

  if (!isValidIparamTestData(type, regex, value)) {
    errMsgs.push(`For '${fieldName}' of the '${key}': ${ERROR_MESSAGES[type]}`);
  }
  return errMsgs;
}

function validateCustomRegex(key, value, attrs, fieldName) {
  const errMsgs = [];
  const regexAttrs = attrs.regex;

  for (var regexKey in regexAttrs) {
    if (!isValidIparamTestData(regexKey, regexAttrs[regexKey], value)) {
      errMsgs.push(`For '${fieldName}' of the '${key}': ${regexAttrs[`${regexKey}-error`]}`);
    }
  }
  return errMsgs;
}

function regexValidation(key, attrs, fieldValue, fieldName) {
  const isCustomRegex = !_.isEmpty(attrs.regex);
  let errMsgs = [];

  if (isCustomRegex && _.includes(VALID_REGEX_TYPES, attrs.type)) {
    errMsgs = errMsgs.concat(validateCustomRegex(key, fieldValue, attrs, fieldName));
  }
  if (!isCustomRegex && DEFAULT_REGEX[attrs.type]) {
    errMsgs = errMsgs.concat(validateDefaultRegex(key, fieldValue, attrs, fieldName));
  }
  return errMsgs;
}

function regexValidateTestData(jsonContent, testData) {
  let errMsgs = [];

  for (const field in jsonContent) {
    const attrs = jsonContent[field];
    const value = testData[field];

    if (!value){
      continue;
    }
    errMsgs = errMsgs.concat(regexValidation(field, attrs, value, TEST_DATA));
  }
  return errMsgs;
}

function validateIparamTestData(iparamsJSON, iparamsTestData) {
  const err = [];

  for (const key in iparamsJSON) {
    const type = iparamsJSON[key][TYPE];
    const options = iparamsJSON[key][OPTIONS];
    let isValid = true;
    let testData = iparamsTestData[key];

    if (_.includes(TYPES_WITH_OPTIONS, type) && testData) {
      if (type === MULTISELECT) {
        testData = !Array.isArray(testData) ? new Array(testData) : testData;
        const validOptions = _.intersection(options, testData);

        if (validOptions.length !== testData.length) {
          isValid = false;
        }
      } else if (!_.includes(options, testData)) {
        isValid = false;
      }
      if (!isValid){
        err.push(`Test data for '${key}' is not specified in the options`);
      }
    }
  }
  return err;
}

module.exports = {
  validate() {
    const htmlFile = `${process.cwd()}/config/iparams.html`;

    if (fileUtil.fileExists(htmlFile)) {
      return [];
    }

    const errMsgs = [];

    if (fileUtil.fileExists(`${process.cwd()}/config/`)) {
      const iparamsTestData = configUtil.getValuesForLocalTesting();
      const iparamsJsonContent = configUtil.getConfig();

      errMsgs.push(requiredValidation(iparamsJsonContent, iparamsTestData));
      errMsgs.push(regexValidateTestData(iparamsJsonContent, iparamsTestData));
      errMsgs.push(validateIparamTestData(iparamsJsonContent, iparamsTestData));
    }
    return _.flattenDeep(errMsgs);
  },

  validateDefaultValue(key, field){
    const errMsgs = [];
    const value = field[DEFAULT_VALUE];

    errMsgs.push(regexValidation(key, field, value, DEFAULT_VALUE));

    return _.flattenDeep(errMsgs);
  },

  validationType: [validationConst.RUN_VALIDATION]
};