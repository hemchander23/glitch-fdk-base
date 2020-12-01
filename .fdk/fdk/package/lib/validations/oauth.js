'use strict';

const _ = require('lodash');

const fileUtil = require('../utils/file-util');
const mf = require('../manifest');
const validationConst = require('./constants').validationContants;

const OAUTH = 'oauth';
const AGENT_OAUTH = 'agent_oauth';
const MANDATORY_KEYS = [
  'client_id',
  'client_secret',
  'authorize_url',
  'token_url',
  'token_type'
];
const VALID_TOKEN_TYPES = ['account', 'agent'];
const VALID_KEYS = ['display_name', 'description', 'type', 'required'];
const OAUTH_CONFIG_FILE = 'oauth_config.json';
const MANDATORY_OAUTH_IPARAM_KEYS = ['display_name', 'description', 'type'];
const VALID_TYPES = ['text'];
const TYPE = 'type';

function validateMandatoryKeys(oauthConfig) {
  let missingKeys = [];

  for (var key in oauthConfig) {
    if (oauthConfig[key] === null || oauthConfig[key] === '') {
      delete oauthConfig[key];
    }
  }
  missingKeys = _.difference(MANDATORY_KEYS, _.keys(oauthConfig));
  if (missingKeys.length > 0) {
    return `Mandatory key(s) missing in oauth_config.json - ${missingKeys.join(', ')}.`;
  }
}

function validateTokenType(oauthConfig) {
  if (!(_.isNull(oauthConfig.token_type)) && !(_.isUndefined(oauthConfig.token_type))) {
    if (!(_.includes(VALID_TOKEN_TYPES, oauthConfig.token_type))) {
      return `Invalid token type mentioned in oauth_config.json - ${oauthConfig.token_type}.`;
    }
  }
}

function validateOauthIparams(oauthConfig) {
  const oauthIparams = oauthConfig.oauth_iparams;

  if (oauthIparams) {
    const errs = [];
    const keywordsUsed = _.intersection(VALID_KEYS, Object.keys(oauthIparams));

    if (keywordsUsed.length > 0) {
      return `Reserved keywords ${keywordsUsed} used as keys in ${OAUTH_CONFIG_FILE}.`;
    }
    for (const key in oauthIparams) {
      for (const detail in oauthIparams[key]) {
        if (oauthIparams[key][detail] && _.isEmpty(oauthIparams[key][detail])) {
          delete oauthIparams[key][detail];
        }
      }
      if (key.length === 0) {
        errs.push('The oauth_iparams key should be a non-empty string.');
        continue;
      }

      const missingKeys = _.difference(MANDATORY_OAUTH_IPARAM_KEYS, _.keys(oauthIparams[key]));

      if (!(_.isObject(oauthIparams[key])) || missingKeys.length > 0) {
        errs.push(
          `Mandatory key(s) ${missingKeys} missing for ${key} in ${OAUTH_CONFIG_FILE}.`
        );
      }
      if (!_.includes(VALID_TYPES, oauthIparams[key][TYPE])) {
        errs.push(
          `Invalid type '${oauthIparams[key][TYPE]}' found in ${OAUTH_CONFIG_FILE}.`);
      }
      if (_.difference(Object.keys(oauthIparams[key]), VALID_KEYS).length > 0) {
        errs.push(`Invalid keys in ${OAUTH_CONFIG_FILE}`);
      }
    }
    return errs;
  }
}

module.exports = {
  name: 'oauth',

  validate() {
    const errMsgs = [];
    let oauthConfig;

    if (_.includes(mf.features, OAUTH) || _.includes(mf.features, AGENT_OAUTH)) {
      try {
        oauthConfig = JSON.parse(fileUtil.readFile('./config/oauth_config.json'));
      }
      catch (e) {
        return [`oauth_config.json - ${e.message}`];
      }
      [ validateMandatoryKeys,
        validateTokenType,
        validateOauthIparams ].forEach((validator) => {
        const validationMessage = validator(oauthConfig);

        if (!(_.isUndefined(validationMessage))) {
          errMsgs.push(validationMessage);
        }
      });
    }
    return _.flattenDeep(errMsgs);
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
