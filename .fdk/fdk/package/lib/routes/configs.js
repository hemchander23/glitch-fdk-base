'use strict';

const _ = require('lodash');
const os = require('os');


const httpUtil = require('../utils/http-util');
const manifest = require('../manifest');
const oauth = require('./oauth2');
const configUtil = require('../utils/config-util');
const productInfo = require('../utils/product-info-util');
const addonVersion = productInfo.getAddonVersion();
const formConfig = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/form_config.json`);
const FormService = require('../../marketplace_configs_js');


const Router = require('express').Router;
const configsRouter = new Router();

const OMNIAPP = 'freshworks';

/*
  Save custom Iparams data to storage (file) with namespace
*/
function saveIParamsToDB(data, product) {
  configUtil.setConfig(data, product);
}

/*
  Fetch custom IParams data from storage (file) with namespace
*/
function getIParamsFromDB(product) {
  return configUtil.getValuesForLocalTesting(product);
}

/*
  Route handler - fetch
  Get custom IParams from storage
  If exists return data else return {}
*/
function fetchCustomIParams(req, res) {
  let customIParams = getIParamsFromDB(req.query.product);

  if (customIParams === null || customIParams === undefined) {
    customIParams = {};
  }

  return res.send({
    hasIParam: configUtil.hasConfig(),
    customIParams
  });
}

/*
  Route handler - To store custom IParams
  Store posted custom IParams to DB
*/
function storeCustomIParams(req, res) {
  saveIParamsToDB(req.body, req.query.product);
  res.send();
}

/*
  Route handler - To fetch custom installation Page
  If app is oauth & not authorized
    -> Authorize and redirect to form page
*/
function customIParamsPage(req, res) {
  let product = req.query.product;

  if (Object.keys(manifest.product).length > 1 && !product) {
    res.writeHead(httpUtil.status.found, {
      'Location': 'http://localhost:10001/choose_product?callback=http://localhost:10001/custom_configs'
    });
    return res.end();
  }

  product = product || Object.keys(manifest.product)[0];
  if (manifest.features.includes('oauth') && !_.has(oauth.fetchCredentials(null, product), 'access_token')) {
    const queryString = product ? `?product=${product}` : '';

    res.writeHead(httpUtil.status.found, {
      'Location': `http://localhost:10001/auth/index?callback=http://localhost:10001/custom_configs${queryString}`
    });
    return res.end();
  }

  return res.render('custom-iparams.html');
}

/**
 * Custom attributes in json sent as part of field_options to form_serv
 */
function getFieldOptions(dataObj) {
  const custom_attributes = ['secure-iparam'];

  if (dataObj['data-bind']) {
    custom_attributes.push('bind');
  }

  const field_options = Object.assign({
    'fms_custom_attr': custom_attributes.join(','),
    'secure-iparam': dataObj.secure || false,
    'type_attributes': dataObj.type_attributes || null
  }, dataObj['data-bind'] ? {
    bind: dataObj['data-bind']
  } : {});

  return field_options;
}

/**
 * Convert the JSON in iparams.json to the format supported by Form Service
 */
function iparamToFormServJSON(iparams) {
  const result = {
    fields: []
  };

  Object.keys(iparams).forEach((key) => {
    const value = iparams[key];

    result.fields.push({
      name: key,
      label: value.display_name,
      hint: value.description,
      type: value.type,
      default_value: value.default_value,
      required: value.required,
      regex: value.regex,
      visible: value.visible !== false,
      choices: value.options ? value.options.map((op) => {
        return {
          value: op
        };
      }) : null,
      field_options: getFieldOptions(value),
      events: value.events
    });
  });
  return result;
}

function constructConfigs(productName) {
  const config = {
    assets: {
      css: [
        { href: `https://${formConfig.static_assets}/${formConfig.product_theme[productName]}` },
        { href: `https://${formConfig.static_assets}/${formConfig.freshapps_css}` }
      ],
      js: [
        { src: `https://${formConfig.static_assets}/${formConfig.freshclient_js}` },
        { src: `https://${formConfig.static_assets}/${formConfig.freshapps_js}`}
      ]
    }
  };

  return config;
}

/*
  Route handler - To fetch custom installation page form content
*/
async function customIParamsForm(req, res) {
  if (configUtil.hasHTMLConfig()) {
    return res.send(configUtil.getHTMLContent());
  }

  if (configUtil.hasJSONConfig()) {
    // !! DONOT REPLACE THIS LINE WITH REQUIRE AS IT CACHES IPARAMS AND WE DONT WANT THAT !!
    const iparamJSON = iparamToFormServJSON(configUtil.getConfig());
    const hasIparamsJs = configUtil.hasIparamsJs();
    const products = Object.keys(manifest.product);

    const productName = products.length > 1 ? OMNIAPP : products[0] ;

    const config = constructConfigs(productName);
    // eslint-disable-next-line new-cap
    const formServiceHelper = new FormService(config);
    const result = await formServiceHelper.getHtml(iparamJSON, hasIparamsJs);

    return res.send(result);
  }

  return res.send();
}

configsRouter.get('/custom_configs', customIParamsPage);
configsRouter.get('/custom_configs/form', customIParamsForm);
configsRouter.get('/custom_configs/fetch', fetchCustomIParams);
configsRouter.post('/custom_configs/store', storeCustomIParams);

module.exports = configsRouter;
