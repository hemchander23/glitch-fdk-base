'use strict';

const _ = require('lodash');
const cheerio = require('cheerio');
const esprima = require('esprima');

const configUtil = require('../utils/config-util');
const fileUtil = require('../utils/file-util');
const testDataValidator = require('./iparam_test_data-validation');
const validationConst = require('./constants').validationContants;

const VALID_KEYS = [
  'display_name',
  'description',
  'type',
  'required',
  'default_value',
  'options',
  'regex',
  'secure',
  'data-bind'
];
const VALID_TYPES = [
  'text',
  'dropdown',
  'email',
  'phone_number',
  'paragraph',
  'number',
  'url',
  'radio',
  'checkbox',
  'multiselect',
  'date'
];
const TYPES_WITH_OPTIONS = [
  'dropdown',
  'radio',
  'multiselect'
];
const VALID_REGEX_TYPES = [
  'text',
  'email',
  'phone_number',
  'number',
  'url'
];
const OPTIONS = 'options';
const DEFAULT_VALUE = 'default_value';
const TYPE = 'type';
const MANDATORY_KEYS = ['display_name', 'type'];
const HTML_FILE = 'iparams.html';
const JSON_FILE = 'iparams.json';
const CONFIG_METHODS = ['getConfigs', 'postConfigs'];
const REGEX = 'regex';
const REQUIRED = 'required';
const SECURE = 'secure';
const CHECKBOX = 'checkbox';

const debuglog = __debug.bind(null, __filename);

function validateKeys(content) {
  const err = [];

  for (const key in content) {
    if (!_.includes(TYPES_WITH_OPTIONS, content[key][TYPE])) {
      continue;
    }
    if (!(DEFAULT_VALUE in content[key])) {
      err.push(
        `default_value must be specified for type ${content[key][TYPE]} in ${JSON_FILE}.`
      );
    }
    if (!(OPTIONS in content[key])) {
      err.push(
        `Options must be specified for type ${content[key][TYPE]} in ${JSON_FILE}.`);
      continue;
    }
    if (!Array.isArray(content[key][OPTIONS])) {
      err.push(
        `${content[key][TYPE]} options for '${key}' in ${JSON_FILE} are not in the list format.`
      );
      continue;
    }
    if (content[key][DEFAULT_VALUE] && !(_.includes(content[key][
      OPTIONS
    ], content[key][DEFAULT_VALUE]))) {
      err.push(
        `Default value specified for '${key}' in ${JSON_FILE} is not specified in the options.`
      );
    }
  }
  return err;
}

function optionsValidator() {
  const errs = [];
  const content = configUtil.getConfig();

  if (content) {
    errs.push(validateKeys(content));
  }
  return _.flattenDeep(errs);
}

function isValidRegex(regex) {
  let isValid = true;

  try {
    new RegExp(regex);
  }
  catch (e){
    isValid = false;
  }
  return isValid;
}

function validateRegex(key, iparam) {
  const errs = [];
  const regex = iparam[REGEX];
  const regexKeys = Object.keys(regex);

  if (!_.includes(VALID_REGEX_TYPES, iparam[TYPE])) {
    errs.push(
      `Regex for '${iparam[TYPE]}' type is not supported.`);
    return errs;
  }

  if (regexKeys.length < 1) {
    errs.push(
      `Regex should not be empty in ${JSON_FILE} for '${key}'.`
    );
  }
  for (var rKey in regexKeys) {
    const regexName = regexKeys[rKey];

    if (regexName.endsWith('-error')) {
      continue;
    }
    if (regexKeys.indexOf(`${regexName}-error`) < 0) {
      errs.push(
        `Error message is missing for the regex '${regexName}' for '${key}' in ${JSON_FILE}.`
      );
    }
    if (!isValidRegex(regex[regexName])){
      errs.push(
        `Invalid regex provided for '${regexName}' for '${key}' in ${JSON_FILE}.`
      );
    }
  }
  return errs;
}

function checkValidKeys(content) {
  const errs = [];
  const keywordsUsed = _.intersection(VALID_KEYS, Object.keys(content));

  if (keywordsUsed.length > 0) {
    return `Reserved keywords ${keywordsUsed} used as keys in ${JSON_FILE}.`;
  }
  for (const key in content) {
    if (key.length === 0) {
      errs.push('The iparam key should be a non-empty string.');
      continue;
    }
    const missingKeys = _.difference(MANDATORY_KEYS, _.keys(content[key]));

    if (!(_.isObject(content[key])) || missingKeys.length > 0) {
      errs.push(
        `Mandatory key(s) ${missingKeys} missing for ${key} in ${JSON_FILE}.`
      );
    }
    if (!_.includes(VALID_TYPES, content[key][TYPE])) {
      errs.push(
        `Invalid type '${content[key][TYPE]}' found in ${JSON_FILE}.`);
    }
    if (_.difference(Object.keys(content[key]), VALID_KEYS).length > 0) {
      errs.push(`Invalid keys in ${JSON_FILE} `);
    }
    if (!_.includes(TYPES_WITH_OPTIONS, content[key][TYPE])) {
      if (OPTIONS in content[key]) {
        errs.push(
          `Options must not be specified for type ${content[key][TYPE]} in ${JSON_FILE} for '${key}'.`
        );
      }
    }

    if (_.includes(_.keys(content[key]), REQUIRED) && !_.isBoolean(content[key][REQUIRED])) {
      errs.push(
        `Invalid value specified for 'required' for '${key}' in ${JSON_FILE}. It should be a boolean.`
      );
    }

    if (_.includes(_.keys(content[key]), SECURE) && !_.isBoolean(content[key][SECURE])) {
      errs.push(
        `Invalid value specified for 'secure' for '${key}' in ${JSON_FILE}. It should be a boolean.`
      );
    }

    if (content[key][TYPE] === CHECKBOX && _.includes(_.keys(content[key]), DEFAULT_VALUE)
      && !_.isBoolean(content[key][DEFAULT_VALUE])){
      errs.push(
        `Invalid value specified for 'default_value' for '${key}' in ${JSON_FILE}. For checkbox, it should be a boolean.`
      );
    }

    if (content[key][REGEX]) {
      errs.push(validateRegex(key, content[key]));
    }

    if (_.includes(_.keys(content[key]), DEFAULT_VALUE)) {
      errs.push(testDataValidator.validateDefaultValue(key, content[key]));
    }
  }
  return errs;
}

function iparamKeysValidator() {
  const err = [];
  const configs = configUtil.getConfig();

  if (configs) {
    err.push(checkValidKeys(configs));
  }
  return err;
}

function validateTestData() {
  try {
    JSON.parse(fileUtil.readFile('./config/iparam_test_data.json'));
  }
  catch (e) {
    return 'iparam_test_data.json - ' + e.message;
  }
}

function iparamHTMLValidator() {
  const errs = [];
  const $ = cheerio.load(configUtil.getHTMLContent());
  let configMethods = [];

  $('script[type="text/javascript"], script:not([type])').each(function() {
    const ast = esprima.parse($(this).text()).body;
    const exp = _.reduce(ast, (result, item) => {
      if (item.type === 'FunctionDeclaration' && (_.includes(CONFIG_METHODS, item.id.name))) {
        result.push(item.id.name);
      }
      return result;
    }, []);

    configMethods = configMethods.concat(exp);
  });

  const missingMethods = _.difference(CONFIG_METHODS, configMethods);

  if (missingMethods.length > 0) {
    errs.push(`Mandatory method(s) missing in ${HTML_FILE}: ${missingMethods.toString()}.`);
  }

  return errs;
}

module.exports = {
  validate() {
    try {
      const configFolderPath = `${process.cwd()}/config/`;
      let errMsgs = [];

      if (fileUtil.fileExists(configFolderPath)) {
        if (fileUtil.fileExists(`${configFolderPath}${HTML_FILE}`)) {
          if (fileUtil.fileExists(`${configFolderPath}${JSON_FILE}`)) {
            errMsgs.push(`Unsupported File(s). Specify either ${HTML_FILE} or ${JSON_FILE}`);
          }
          errMsgs.push(iparamHTMLValidator());
        }
        else if (!fileUtil.fileExists(`${configFolderPath}${JSON_FILE}`)) {
          errMsgs.push('iparams.json is mandatory.');
        }
        else {
          errMsgs.push(iparamKeysValidator());
          errMsgs.push(optionsValidator());
        }
        errMsgs.push(validateTestData());
      }
      else {
        errMsgs.push('Mandatory folder(s) missing: config');
      }
      errMsgs = _.compact(_.flattenDeep(errMsgs));
      return errMsgs;
    }
    catch (e) {
      debuglog(e);
      return [`Exception occured while validation: ${e.message}`];
    }
  },

  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
