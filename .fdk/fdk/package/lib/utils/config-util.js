'use strict';

/* eslint-disable no-underscore-dangle */

const os = require('os');

const { omit } = require('lodash');

const DataStore = require('./data-util').DataStore;
const eh = require('./error-util');
const fileUtil = require('./file-util');
const nsUtil = fileUtil.nsresolver;

const jsonFile = 'iparams.json';
const htmlFile = 'iparams.html';
const iparamsJs = 'iparams.js';

const oauthConfigFile = 'oauth_config.json';
const validRoutes = {
  'install': ['smi', 'proxy', 'oauth'],
  'configure': ['db', 'proxy', 'oauth', 'smi', 'entity', 'record']
};
const productInfo = require('../utils/product-info-util');
const addonVersion = productInfo.getAddonVersion();
const authDetails = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/auth_details.json`);

function getJSONContent(fileName) {
  const data = fileUtil.readFile(`${process.cwd()}/config/${fileName}`);

  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(`${fileName}:`);
    eh.error(new Error(e));
  }
}

function getIparams(product, onlyNonSecure) {
  const productKey = nsUtil.getInternalNamespace('product_name', { product });
  const iparamsKey = nsUtil.getInternalNamespace('custom_iparams');
  const storage = new DataStore({ scope: productKey });

  let iParams = storage.fetch(iparamsKey) || {};

  if (onlyNonSecure) {
    if (iParams.__meta) {
      const secure = iParams.__meta.secure;

      if (secure && secure.length) {
        iParams = omit(iParams, secure);
      }
    }
  } else {
    // Remove __meta tag.
    delete iParams.__meta;
  }
  return iParams;
}

function hasHTMLConfig() {
  return fileUtil.fileExists(`${process.cwd()}/config/${htmlFile}`);
}

function hasJSONConfig() {
  return fileUtil.fileExists(`${process.cwd()}/config/${jsonFile}`);
}

function hasIparamsJs() {
  return fileUtil.fileExists(`${process.cwd()}/config/assets/${iparamsJs}`);
}

function getConfig() {
  return getJSONContent(jsonFile);
}

function setConfig(config, product) {
  const productKey = nsUtil.getInternalNamespace('product_name', { product });
  const IparamsKey = nsUtil.getInternalNamespace('custom_iparams');
  const storage = new DataStore({ scope: productKey });

  return storage.store(IparamsKey, config);
}

function hasConfig() {
  if (this.hasJSONConfig()) {
    const config = getConfig();

    return Object.keys(config).length !== 0;
  }

  return this.hasHTMLConfig();
}

function purgeConfig(product) {
  if (this.hasHTMLConfig()) {
    return this.setConfig({}, product);
  }

  const config = getJSONContent(jsonFile);

  Object.keys(config).forEach(key => config[key] = '');

  return this.setConfig(config, product);
}

function getValuesForLocalTesting(product) {
  return getIparams(product);
}

function getNonSecureValues(product) {
  return getIparams(product, true);
}

function getHTMLContent() {
  return fileUtil.readFile(`${process.cwd()}/config/${htmlFile}`);
}

function getOAuthIparam() {
  return getJSONContent(oauthConfigFile);
}

function getCustomIparamState(product) {
  return (this.hasConfig() && Object.keys(getIparams(product)).length === 0) ? 'install' : 'configure';
}

function isValidRoute(route, product) {
  var state = this.getCustomIparamState(product);

  return validRoutes[state].includes(route);
}

function getIparamsJs() {
    return fileUtil.readFile(`${process.cwd()}/config/assets/${iparamsJs}`);
}

/**
 * Decodes the payload part of JWT token
 *
 * @param {*} token - JWT token part of incoming request
 */
function getJWTPayload (token) {
  const base64Payload = token.split('.')[1];
  const payload = Buffer.from(base64Payload, 'base64');

  return JSON.parse(payload);
}

/**
 * Validates route against the issuer part of JWT token
 *
 * @param {*} token - JWT token part of incoming request
 * @param {*} route - datapipe allowed routes
 *
 * @returns {boolean} false if route is not part of issuer privileges
 */
function isAllowedIssuerRoute (token, route) {
  if (token) {
    const issuer = getJWTPayload(token).iss;
    const issuerAuthDetails = authDetails.issuers[issuer];

    if (issuerAuthDetails && !(route in issuerAuthDetails.privileges)){
      return false;
    }
  }
  return true;
}

module.exports = {
  hasHTMLConfig,
  hasJSONConfig,
  hasConfig,
  hasIparamsJs,
  getConfig,
  setConfig,
  purgeConfig,
  getValuesForLocalTesting,
  getNonSecureValues,
  getHTMLContent,
  getOAuthIparam,
  getCustomIparamState,
  isValidRoute,
  getIparamsJs,
  isAllowedIssuerRoute
};
