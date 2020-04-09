'use strict';

/* eslint-disable no-underscore-dangle */

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
  'configure': ['db', 'proxy', 'oauth', 'smi']
};

const storage = new DataStore({});

function getJSONContent(fileName) {
  const data = fileUtil.readFile(`${process.cwd()}/config/${fileName}`);

  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(`${fileName}:`);
    eh.error(new Error(e));
  }
}

function getIparams(onlyNonSecure) {
  let iParams = storage.fetch(nsUtil.getInternalNamespace('custom_iparams')) || {};

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

function hasConfig() {
  return this.hasJSONConfig() || this.hasHTMLConfig();
}

function getConfig() {
  return getJSONContent(jsonFile);
}

function setConfig(config) {
  return storage.store(nsUtil.getInternalNamespace('custom_iparams'), config);
}

function purgeConfig() {
  if (this.hasHTMLConfig()) {
    return this.setConfig({});
  }

  const config = getJSONContent(jsonFile);

  Object.keys(config).forEach(key => config[key] = '');

  return this.setConfig(config);
}

function getValuesForLocalTesting() {
  return getIparams();
}

function getNonSecureValues() {
  return getIparams(true);
}

function getHTMLContent() {
  return fileUtil.readFile(`${process.cwd()}/config/${htmlFile}`);
}

function getOAuthIparam() {
  return getJSONContent(oauthConfigFile);
}

function getCustomIparamState() {
  return (this.hasHTMLConfig() && Object.keys(getIparams()).length === 0) ? 'install' : 'configure';
}

function isValidRoute(route) {
  var state = this.getCustomIparamState();

  return validRoutes[state].includes(route);
}

function getIparamsJs() {
    return fileUtil.readFile(`${process.cwd()}/config/assets/${iparamsJs}`);
}

module.exports = {
  hasHTMLConfig,
  hasJSONConfig,
  hasConfig,
  getConfig,
  setConfig,
  purgeConfig,
  getValuesForLocalTesting,
  getNonSecureValues,
  getHTMLContent,
  getOAuthIparam,
  getCustomIparamState,
  isValidRoute,
  getIparamsJs
};
