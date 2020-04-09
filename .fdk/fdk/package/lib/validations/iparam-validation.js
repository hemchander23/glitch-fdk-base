'use strict';

const _ = require('lodash');
const cheerio = require('cheerio');
const esprima = require('esprima');

const configUtil = require('../utils/config-util');
const fileUtil = require('../utils/file-util');
const validationConst = require('./constants').validationContants;
const productInfo = require('../utils/product-info-util');

const VALID_KEYS = [
  'display_name',
  'description',
  'type',
  'required',
  'default_value',
  'options',
  'regex',
  'secure',
  'data-bind',
  'type_attributes',
  'events'
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
  'date',
  'domain',
  'api_key'
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
  'url'
];
const VALID_EVENTS = [
  'change'
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
const DOMAIN = 'domain';
const API_KEY = 'api_key';
const TYPE_ATTRIBUTES = 'type_attributes';
const PRODUCT = 'product';
const FRESHCHAT = 'freshchat';
const MANDATORY_TYPE_ATTRIBUTE = ['product'];
const EVENTS = 'events';

const debuglog = __debug.bind(null, __filename);
const productList = productInfo.getProductList();

function validateKeys(content) {
  const err = [];

  for (const key in content) {
    if (!_.includes(TYPES_WITH_OPTIONS, content[key][TYPE])) {
      continue;
    }
    if (!(DEFAULT_VALUE in content[key])) {
      err.push(
        `In the '${key}' field, specify the default value for the ${content[key][TYPE]} type.`
      );
    }
    if (!(OPTIONS in content[key])) {
      err.push(
        `In the '${key}' field, specify options for the ${content[key][TYPE]} type.`);
      continue;
    }
    if (!Array.isArray(content[key][OPTIONS])) {
      err.push(
        `For the '${key}' ${content[key][TYPE]} type, add the options as an array.`
      );
      continue;
    }
    if (Array.isArray(content[key][DEFAULT_VALUE]) && _.intersection(content[key][OPTIONS],
        content[key][DEFAULT_VALUE]).length !== content[key][DEFAULT_VALUE].length) {
      err.push(
        `The default value specified for the '${key}' ${content[key][TYPE]} type is not listed in the options.`
      );
      continue;
    }
    if (!Array.isArray(content[key][DEFAULT_VALUE]) && !(_.includes(content[key][
        OPTIONS
      ], content[key][DEFAULT_VALUE]))) {
      err.push(
        `The default value specified for the '${key}' ${content[key][TYPE]} type is not listed in the options.`
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
  } catch (e) {
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
      `Regex for ${iparam[TYPE]} type is not supported.`);
    return errs;
  }

  if (regexKeys.length < 1) {
    errs.push(
      `For the '${key}' field, regex should not be empty.`
    );
  }
  for (var rKey in regexKeys) {
    const regexName = regexKeys[rKey];

    if (regexName.endsWith('-error')) {
      continue;
    }
    if (regexKeys.indexOf(`${regexName}-error`) < 0) {
      errs.push(
        `In the '${key}' field, error message is missing for '${regexName}'.`
      );
    }
    if (!isValidRegex(regex[regexName])) {
      errs.push(
        `Invalid regex entered for '${regexName}' in the '${key}' field.`
      );
    }
  }
  return errs;
}

function checkValidKeys(content) {
  const errs = [];
  const keywordsUsed = _.intersection(VALID_KEYS, Object.keys(content));

  if (keywordsUsed.length > 0) {
    return `Do not use reserved keywords, ${keywordsUsed}, as keys.`;
  }
  for (const key in content) {
    if (key.length === 0) {
      errs.push('The iparam key should be a non-empty string.');
      continue;
    }
    const missingKeys = _.difference(MANDATORY_KEYS, _.keys(content[key]));

    if (!(_.isObject(content[key])) || missingKeys.length > 0) {
      errs.push(
        `The mandatory key(s), ${missingKeys}, missing for the '${key}' field.`
      );
    }
    if (!_.includes(VALID_TYPES, content[key][TYPE])) {
      errs.push(
        `Invalid type, ${content[key][TYPE]}, found in the '${key}' field.`);
    }
    const invalidKeys = _.difference(Object.keys(content[key]), VALID_KEYS);

    if (invalidKeys.length > 0) {
      errs.push(`Invalid key(s), ${invalidKeys}, found in the '${key}' field.`);
    }
    if (!_.includes(TYPES_WITH_OPTIONS, content[key][TYPE])) {
      if (OPTIONS in content[key]) {
        errs.push(
          `Options must not be specified fo ${content[key][TYPE]} type in the '${key}' field.`
        );
      }
    }

    if ((content[key][TYPE] === DOMAIN || content[key][TYPE] === API_KEY)) {
      if (!_.includes(_.keys(content[key]), TYPE_ATTRIBUTES)) {
        errs.push(
          `${TYPE_ATTRIBUTES} must be specified for type ${content[key][TYPE]} in ${JSON_FILE}.`
        );
      } else {
        const missingTypeAttribute = _.difference(MANDATORY_TYPE_ATTRIBUTE,
          _.keys(content[key][TYPE_ATTRIBUTES]));

        if (missingTypeAttribute.length > 0) {
          errs.push(
            `Mandatory key(s) ${missingTypeAttribute} missing in ${TYPE_ATTRIBUTES} for ${key} in ${JSON_FILE}.`
          );
        } else if (content[key][TYPE] === DOMAIN &&
          !productList.includes(content[key][TYPE_ATTRIBUTES][PRODUCT])) {
          errs.push(
            `Invalid product name format '${content[key][TYPE_ATTRIBUTES][PRODUCT]}'. Use lowercase without space`
          );
        } else if (content[key][TYPE] === DOMAIN &&
          content[key][TYPE_ATTRIBUTES][PRODUCT] === FRESHCHAT) {
          errs.push(
            `Invalid type '${content[key][TYPE]}' for ${FRESHCHAT} product found in ${JSON_FILE}.`
          );
        }
      }
    }

    if (_.includes(_.keys(content[key]), REQUIRED) && !_.isBoolean(content[key][REQUIRED])) {
      errs.push(
        `Specify either true or false for the required key in the '${key}' field.`
      );
    }

    if (_.includes(_.keys(content[key]), SECURE) && !_.isBoolean(content[key][SECURE])) {
      errs.push(
        `Specify either true or false for the secure key in the '${key}' field.`
      );
    }

    if (content[key][TYPE] === CHECKBOX && _.includes(_.keys(content[key]), DEFAULT_VALUE) &&
      !_.isBoolean(content[key][DEFAULT_VALUE])) {
      errs.push(
        `Specify either true or false for the default_value key in the '${key}' field.`
      );
    }

    if (_.includes(_.keys(content[key]), EVENTS)) {
      if (!Array.isArray(content[key][EVENTS])) {
        errs.push(
          `For the '${key}' ${content[key][TYPE]} type, add the Events as an array.`
        );
      } else {
        const events = content[key][EVENTS];
        const iparamsJs = configUtil.getIparamsJs();
        const ast = esprima.parse(iparamsJs).body;
        const exp = _.reduce(ast, (result, item) => {
          if (item.type === 'FunctionDeclaration') {
            result.push(item.id.name);
          }
          return result;
        }, []);

        events.forEach(function (ev) {
          const diff = _.difference(_.keys(ev), VALID_EVENTS);

          if (diff.length > 0) {
            errs.push(`The ${diff} event is not supported in the '${key}' field`);
          }

          if (!exp.includes(ev[_.keys(ev)])) {
            errs.push(`The ${_.values(ev)} function does not exist for the '${key}' field.`);
          }
        });
      }
    }

    if (content[key][REGEX]) {
      errs.push(validateRegex(key, content[key]));
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

function iparamHTMLValidator() {
  const errs = [];
  const $ = cheerio.load(configUtil.getHTMLContent());
  let configMethods = [];

  $('script[type="text/javascript"], script:not([type])').each(function () {
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
        } else if (!fileUtil.fileExists(`${configFolderPath}${JSON_FILE}`)) {
          errMsgs.push('iparams.json is mandatory.');
        } else {
          errMsgs.push(iparamKeysValidator());
          errMsgs.push(optionsValidator());
        }
      } else {
        errMsgs.push('Mandatory folder(s) missing: config');
      }
      errMsgs = _.compact(_.flattenDeep(errMsgs));
      return errMsgs;
    } catch (e) {
      debuglog(e);
      return [`Exception occured while validation: ${e.message}`];
    }
  },

  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
