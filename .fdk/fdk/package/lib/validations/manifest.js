'use strict';

/* eslint-disable no-useless-escape*/

const _ = require('lodash');
const os = require('os');
const url = require('url');

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const sizeOf = require('image-size');
const constants = require('./constants');

const addonVersion = require('../utils/product-info-util').getAddonVersion();
const productLocations = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/locations/product_locations`);
const fdkconfig = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/product_info.json`);

const SUPPORTED_PLATFORMS = ['2.0', '2.1'];
const ICON_HEIGHT = 64;
const ICON_WIDTH = 64;
const IP_REGEX = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/;
const IPARAM_REGEX = /\<\%\=\s*.*\s*\%\>/;
const STAR_REGEX = /^(https:\/\/)[\*]+([\-\.]{1}[a-z0-9]+)*\.[a-z]*$/;
const validationConst = constants.validationContants;
const validOmniAppProducts = fdkconfig.omni_products;

function validatePlatform() {
  if (!(_.includes(SUPPORTED_PLATFORMS, manifest.pfVersion))) {
    return `Invalid platform version mentioned in manifest.json - ${manifest.pfVersion}`;
  }
  if (manifest.pfVersion === '2.0' && Object.keys(manifest.product||{}).length > 1) {
    console.log('\x1b[33m[WARN]\x1b[0m Platform version 2.0 will be deprecated shortly.\nPlease update the app manifest to latest version (2.1) to use latest features.\n');
  }
}

function validateProduct() {
  /*
    validate the products mentioned in manifest.json
  */
  if (_.isEmpty(_.keys(manifest.product))) {
    return 'Atleast one product must be mentioned in manifest.json';
  }

  const invalidProducts = _.difference(_.keys(manifest.product), _.keys(productLocations));

  if (invalidProducts.length > 0) {
    return `Invalid product(s) mentioned in manifest.json: ${invalidProducts}`;
  }
}

//For the validation of omni apps
function validateOmniApp() {
  const productArray = _.keys(manifest.product);

  const invalidOmniAppProducts = _.difference(productArray, validOmniAppProducts);

  if (invalidOmniAppProducts.length) {
    return `Omniapps is available only for - ${validOmniAppProducts}`;
  }
}

function validateLocation(appType) {
  let prod;
  let invalidLocationMsg = '';
  let products = manifest.product;

  /*
    Skip location validation if purebackend app.
  */
  if (appType && appType.includes('purebackend')) {
    return;
  }

  if (manifest.features.includes('omni') &&
    manifest.features.includes('backend') && manifest.pfVersion !== '2.0') {
    products = {};
    for (prod in manifest.product) {
      if (manifest.product[prod].location || !manifest.product[prod].events) {
        products[prod] = manifest.product[prod];
      }
    }
  }
  /*
    validate the locations mentioned under each product in manifest.json
    if it is not a purebackend app.
  */
  try {
    for (prod in products) {
      const manifestLocations = Object.keys(products[prod].location);

      if (_.isEmpty(manifestLocations)) {
        return `Missing locations for product: ${prod}`;
      }
      const invalidLocations = _.difference(manifestLocations, productLocations[prod].location);

      if (invalidLocations.length > 0) {
        invalidLocationMsg += `\n     ${prod} - ${invalidLocations}`;
      }
    }
  } catch (err) {
    console.log(err);
    return 'Invalid manifest / folder configuration for app';
  }

  if (invalidLocationMsg !== '') {
    return `Invalid location(s) mentioned in manifest.json: ${invalidLocationMsg}`;
  }

  if (fileUtil.fileExists('./app')) {
    const locationFieldErr = [];

    for (prod in products) {
      for (const location in products[prod].location) {
        const templateFile = products[prod].location[location].url;
        const icon = products[prod].location[location].icon;

        if (_.isUndefined(templateFile) || templateFile === '') {
          locationFieldErr.push(`Url is either not mentioned or empty in ${prod}/${location}`);
        }
        else if (fileUtil.fileExists(`./app/${templateFile}`) === false) {
          locationFieldErr.push(`Template file '${templateFile}' mentioned in ${prod}/${location} is not found in app folder`);
        }
        if (!_.includes(productLocations[prod].location_without_icons, location)) {
          if (_.isUndefined(icon) || icon === '') {
            locationFieldErr.push(`Icon is either not mentioned or empty in ${prod}/${location}`);
          }
          else if (fileUtil.fileExists(`./app/${icon}`) === false) {
            locationFieldErr.push(`Icon '${icon}' mentioned in ${prod}/${location} is not found in app folder`);
          }
          else {
            const dimensions = sizeOf(`./app/${icon}`);

            if (dimensions.width !== ICON_WIDTH || dimensions.height !== ICON_HEIGHT) {
              locationFieldErr.push(`Invalid dimension of icon '${icon}' for ${prod}/${location}`);
            }
          }
        }
      }
    }
    return locationFieldErr;
  }
}

function validateWhitelistedDomains() {
  const err = [];
  const ipDomains = [];
  const slashDomains = [];
  const httpDomains = [];
  const localhostDomains = [];
  const domainWithPath = [];
  const regexDomains = [];

  for (const domain of manifest.whitelistedDomains) {
    if (domain.indexOf('*') !== -1) {
      if (!domain.match(STAR_REGEX)) {
        regexDomains.push(domain);
      }
    }
    else {
      const urlObject = url.parse(domain.replace(IPARAM_REGEX, 'abc'));

      if (urlObject.path !== '/') {
        domainWithPath.push(domain);
      }
      else if (domain.endsWith('/')) {
        slashDomains.push(domain);
      }
      if (urlObject.hostname === 'localhost') {
        localhostDomains.push(domain);
      }
      if (!(domain.startsWith('https://'))) {
        httpDomains.push(domain);
      }
      if (!_.isNull(IP_REGEX.exec(urlObject.hostname))) {
        ipDomains.push(domain);
      }
    }
  }
  if (!(_.isEmpty(ipDomains))) {
    err.push(`Whitelisted domains must not contain IP addresses: ${ipDomains}`);
  }
  if (!(_.isEmpty(slashDomains))) {
    err.push(`Whitelisted domains must not end with a '/': ${slashDomains}`);
  }
  if (!(_.isEmpty(httpDomains))) {
    err.push(`Whitelisted domains must use HTTPS: ${httpDomains}`);
  }
  if (!(_.isEmpty(domainWithPath))) {
    err.push(`Whitelisted domains must not have path: ${domainWithPath}`);
  }
  if (!(_.isEmpty(localhostDomains))) {
    err.push(`Whitelisted domains must not be localhost: ${localhostDomains}`);
  }
  if (!(_.isEmpty(regexDomains))) {
    err.push(`Whitelisted domains must not have more than one subdomain: ${regexDomains}`);
  }
  return err;
}

module.exports = {
  name: 'manifest',

  validate(appType) {
    const errMsgs = [];
    const productErr = validateProduct();
    let omniError;
    let locationErr;

    const whitelistDomainErr = validateWhitelistedDomains();

    if (manifest.features.includes('omni')) {
      omniError = validateOmniApp();
    }

    if (!(_.isUndefined(whitelistDomainErr))) {
      errMsgs.push(whitelistDomainErr);
    }

    if (_.isUndefined(productErr)) {
      locationErr = validateLocation(appType);
    }
    const platformErr = validatePlatform();

    if (!(_.isUndefined(productErr))) {
      errMsgs.push(productErr);
    }
    if (!(_.isUndefined(locationErr))) {
      errMsgs.push(locationErr);
    }
    if (!(_.isUndefined(platformErr))) {
      errMsgs.push(platformErr);
    }
    if (!(_.isUndefined(omniError))) {
      errMsgs.push(omniError);
    }
    return _.flattenDeep(errMsgs);
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
