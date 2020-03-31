'use strict';

/* eslint-disable no-underscore-dangle */

const _ = require('lodash');

const DataStore = require('./data-store');
const eh = require('./err');
const fileUtil = require('./file-util');
const nsUtil = require('./ns-resolver');

const jsonFile = 'iparams.json';
const htmlFile = 'iparams.html';
const oauthConfigFile = 'oauth_config.json';
const testDataFile = 'iparam_test_data.json';
const validRoutes = {
  'install': ['smi', 'proxy', 'oauth'],
  'configure': ['db', 'proxy', 'oauth', 'smi']
};

const storage = new DataStore({});

const baseHTML = text => `
<html>
  <head>
    <link rel="stylesheet" href="https://d16185quy6wls6.cloudfront.net/fdk/2.0/assets/freshdesk.css">
    <script src="https://d16185quy6wls6.cloudfront.net/fdk/2.0/assets/fresh_client.js"></script>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.0/jquery.min.js"></script>
    <script src="https://d16185quy6wls6.cloudfront.net/configs/freshapps.js"></script>
    <link rel="stylesheet" href="https://d16185quy6wls6.cloudfront.net/configs/freshapps.css">
  </head>
  <body>
    <form>
      ${text}
    </form>
  </body>
</html>
`;

function getJSONContent(fileName) {
  const data = fileUtil.readFile(`${process.cwd()}/config/${fileName}`);

  try {
    return JSON.parse(data);
  }
  catch (e) {
    console.log(`${fileName}:`);
    eh.error(new Error(e));
  }
}

function getIparams(onlyNonSecure) {
  const HTML_FILE = `${process.cwd()}/config/iparams.html`;
  const JSON_FILE = `${process.cwd()}/config/iparams.json`;
  let iParams = {};

  if (fileUtil.fileExists(HTML_FILE)) {
    iParams = storage.fetch(nsUtil.getInternalNamespace('custom_iparams')) || {};

    if (onlyNonSecure) {
      if (iParams.__meta) {
        const secure = iParams.__meta.secure;

        if (secure && secure.length) {
          iParams = _.omit(iParams, secure);
        }
      }
    }
    else {
      // Remove __meta tag.
      delete iParams.__meta;
    }
  }
  else if (fileUtil.fileExists(JSON_FILE)) {
    iParams = getJSONContent(testDataFile);

    if (onlyNonSecure) {
      const iParamsConfig = getJSONContent(jsonFile);
      const secureKeys = _.keys(iParams).filter(
        (prop) => iParamsConfig[prop] && iParamsConfig[prop].secure);

      iParams = _.omit(iParams, secureKeys);
      // Add __meta tag to show relevant error message while retrieving secure iParams in UI.
      iParams.__meta = { secure: secureKeys };
    }
  }
  return iParams;
}

function generateIparamHTML(iparamJSON) {
  function generateLabel(name, text, type = 'label') {
    return `<label class="fserv-${type}" for="${name}"> ${text} </label>`;
  }

  const FORM_SERV_CLASS = {
    checkbox: 'checkbox',
    radio: 'radio'
  };

  function generateRegexValidations(regex) {
    const keys = Object.keys(regex || {});

    return keys.map(key => `data-regex-${key}="${regex[key]}"`).join(' ');
  }

  function generateHTMLElement(name, properties) {
    const type = properties.type,
      defaultValue = properties.default_value || '';

    if (type === 'dropdown' || type === 'multiselect') {
      const options = properties.options
        .map(o => `<option ${o === defaultValue ? 'selected' : ''}>${o}</option>`).join('\n');

      return `<select
        class="fserv-input-text fserv-select"
        name="${name}"
        ${type === 'multiselect' ? 'multiple' : ''}
      >${options}</select>`;
    }

    if (type === 'paragraph') {
      return `<textarea
        class="fserv-input-textarea fserv-textarea"
        name="${name}"
        rows=5
      >${defaultValue}</textarea>`;
    }

    if (type === 'radio') {
      return '<div class="fserv-field">' + properties.options.map(option => {
        return `<label>
          <input class="fserv-input-radio" type="radio" name="${name}" value="${option}" ${option === defaultValue ? 'checked' : ''}>
          ${option}
        </label>`;
      }).join('') + '</div>';
    }

    return `<input
      ${generateRegexValidations(properties.regex)}
      class="fserv-input-${FORM_SERV_CLASS[type] || 'text'} fserv-select"
      name="${name}"
      type=${type === 'phone_number' ? 'tel' : type}
      value="${defaultValue}"
      ${(type === 'checkbox' && !!defaultValue) ? 'checked' : '' }
    >`;
  }

  let formHTML = '';
  let configuration;

  for (const param in iparamJSON) {
    configuration = iparamJSON[param];

    formHTML += `
      <div class="${(configuration.required || configuration.regex) ? 'fserv-required' : ''}">
        ${generateLabel(param, configuration.display_name)}
        ${generateHTMLElement(param, configuration)}
        <!-- This is for validation errors. Don't remove! -->
        <div class="fserv-control" style="display:none;"></div>
        ${generateLabel(param, configuration.description, 'hint')}
      </div>
    `;
  }

  return baseHTML(formHTML);
}

module.exports = {
  generateIparamHTML,

  hasHTMLConfig() {
    return fileUtil.fileExists(`${process.cwd()}/config/${htmlFile}`);
  },

  hasJSONConfig() {
    return fileUtil.fileExists(`${process.cwd()}/config/${jsonFile}`);
  },

  hasConfig() {
    return this.hasJSONConfig() || this.hasHTMLConfig();
  },

  getConfig() {
    return getJSONContent(jsonFile);
  },

  setConfig(config) {
    if (this.hasHTMLConfig()) {
      return storage.store(nsUtil.getInternalNamespace('custom_iparams'), config);
    }

    return fileUtil.writeFile(`${process.cwd()}/config/${testDataFile}`, JSON.stringify(config, null, 2));
  },

  purgeConfig() {
    if (this.hasHTMLConfig()) {
      return this.setConfig({});
    }

    const config = getJSONContent(jsonFile);

    Object.keys(config).forEach(key => config[key] = '');

    return this.setConfig(config);
  },

  getValuesForLocalTesting() {
    return getIparams();
  },

  getNonSecureValues() {
    return getIparams(true);
  },

  getHTMLContent() {
    return fileUtil.readFile(`${process.cwd()}/config/${htmlFile}`);
  },

  getOAuthIparam() {
    return getJSONContent(oauthConfigFile);
  },

  getCustomIparamState() {
    return (this.hasHTMLConfig() && Object.keys(getIparams()).length === 0) ? 'install' : 'configure';
  },

  isValidRoute(route) {
    var state = this.getCustomIparamState();

    return validRoutes[state].includes(route);
  }
};
