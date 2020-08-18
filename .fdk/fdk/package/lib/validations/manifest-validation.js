'use strict';

/* eslint-disable no-useless-escape*/

const _ = require('lodash');
const os = require('os');

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const sizeOf = require('image-size');
const constants = require('./constants');

const addonVersion = require('../utils/product-info-util').getAddonVersion();
const productLocations = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/locations/product_locations`);
const fdkconfig = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/product_info.json`);

const SUPPORTED_PLATFORMS = ['2.0'];
const ICON_HEIGHT = 64;
const ICON_WIDTH = 64;
const validationConst = constants.validationContants;
const validOmniAppProducts = fdkconfig.omni_products;

function validatePlatform() {
  if (!(_.includes(SUPPORTED_PLATFORMS, manifest.pfVersion))) {
    return `Invalid platform version mentioned in manifest.json - ${manifest.pfVersion}`;
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
  /*
    Skip location validation if purebackend app.
  */

  if (_.includes(appType, 'purebackend')) {
    return;
  }
  /*
    validate the locations mentioned under each product in manifest.json
    if it is not a purebackend app.
  */
  for (prod in manifest.product) {
    const manifestLocations = _.keys(manifest.product[prod].location);

    if (_.isEmpty(manifestLocations)) {
      return `Missing locations for product: ${prod}`;
    }
    const invalidLocations = _.difference(manifestLocations, productLocations[prod].location);

    if (invalidLocations.length > 0) {
      invalidLocationMsg += `\n     ${prod} - ${invalidLocations}`;
    }
  }
  if (invalidLocationMsg !== '') {
    return `Invalid location(s) mentioned in manifest.json: ${invalidLocationMsg}`;
  }

  if (fileUtil.fileExists('./app')) {
    const locationFieldErr = [];

    for (prod in manifest.product) {
      for (const location in manifest.product[prod].location) {
        const templateFile = manifest.product[prod].location[location].url;
        const icon = manifest.product[prod].location[location].icon;

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

module.exports = {
  validate(appType) {
    const errMsgs = [];
    const isNoOfProductMoreThanOne = _.keys(manifest.product).length > 1;
    const productErr = validateProduct();
    let omniError;
    let locationErr;

    if (isNoOfProductMoreThanOne) {
      omniError = validateOmniApp();
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

  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
