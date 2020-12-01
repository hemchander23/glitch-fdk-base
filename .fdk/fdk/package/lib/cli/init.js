'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');
const fs = require('fs-extra');
const inquirer = require('inquirer');
const nodeTree = require('nodetree');
const os = require('os');

const errorHandler = require('../utils/error-util');
const util = require('../utils/helper-util');
const productInfo = require('../utils/product-info-util');
const addonVersion = productInfo.getAddonVersion();
const TEMPLATE_ORDER = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/template/template_info.json`).template_order;
const SERVERLESS_APPS = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/template/template_info.json`).serverless_apps;
const RE_IGNORED_FILES = util.IGNORED_FILES;
const OMNI_PRODUCT = 'omni';

function getTemplatesFor(product) {
  return _.intersection(TEMPLATE_ORDER[product], fs.readdirSync(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/template/${product}`).filter(e => !e.match(RE_IGNORED_FILES)));
}
const templatesAllowed = productInfo.getProductList().reduce((templateObject, product) => {
  templateObject[product] = getTemplatesFor(product);
  return templateObject;
}, {});

const MINIMUM_TEMPLATE_COUNT = 1;

const supportedProducts = Object.keys(templatesAllowed);

const ignoreFiles = ['.fdk', '.report.json'];

function initTemplate(product, template, prjDir){
  debuglog(`Initializing template "${template}" with product "${product}".`);

  fs.copySync(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/template/${product}/${template}`, prjDir);

  if (SERVERLESS_APPS[product].includes(template)) {
    if (product === OMNI_PRODUCT) {
      const manifest = fs.readJsonSync(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/template/${product}/${template}/manifest.json`);

      Object.keys(manifest.product).forEach(productName =>
        fs.copySync(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/payloads/${productName}/`, `${prjDir}/server/test_data/${productName}`)
      );
    } else {
      fs.copySync(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/payloads/${product}/`, `${prjDir}/server/test_data`);
    }
  }
  console.log(`A new ${util.capitalize(product)} app was successfully created from template "${template}" with the following files.\n`);
  nodeTree(process.cwd());
}

module.exports = {
  run: (prjDir, template, product) => {

    debuglog(`'init' called with ${prjDir}, ${template}, ${product}`);

    var errMessages = [];

    function isValidproduct(product){

      if (!supportedProducts.includes(product)) {
        errMessages.push(`The specified product ${product} is not valid. The supported products are ${supportedProducts}.`);
      }
      if (!_.isEmpty(errMessages)) {
        return errorHandler.printError('The app could not be created due to the following issues(s):', errMessages);
      }
      if (!_.includes(supportedProducts, product)){
        return false;
      }
      return true;
    }

    function isValidTemplate(template){
      if (template && !templatesAllowed[product].includes(template)) {
        errMessages.push(`The specified template ${template} is not valid. The supported templates are ${templatesAllowed[product]}.`);
      }
      if (!_.isEmpty(errMessages)) {
        return errorHandler.printError('The app could not be created due to the following issues(s):', errMessages);
      }
      if (template && !templatesAllowed[product].includes(template)){
        return false;
      }
      return true;
    }

    function createTemplate(product, template){
      if (template) {
        if (isValidTemplate(template)){
          initTemplate(product, template, prjDir);
        }
      }
      else if (!template && templatesAllowed[product].length > MINIMUM_TEMPLATE_COUNT) {
        return inquirer.prompt({
          type: 'list',
          name: 'template',
          message: 'Choose a template:',
          choices: _.intersection(TEMPLATE_ORDER[product], templatesAllowed[product])
        }).then(val => {
          initTemplate(product, val.template, prjDir );
        });
      }
      else {
        initTemplate(product, templatesAllowed[product][0], prjDir);
      }
    }

    if (!_.isEmpty(fs.readdirSync(prjDir).filter(file => !ignoreFiles.includes(file)))) {
      errMessages.push('The current directory is not empty. Run the command inside an empty directory or use the --app-dir option to specify the path to a new or empty directory.');
    }
    if (!_.isEmpty(errMessages)) {
      return errorHandler.printError('The app could not be created due to the following issues(s):', errMessages);
    }

    if (!product) {
      return inquirer.prompt({
        type: 'list',
        name: 'product',
        message: 'Choose a product:',
        choices: supportedProducts
      }).then((val) => {product = val.product;
        createTemplate(product, template);
      });
    }
    if (isValidproduct(product)){
      createTemplate(product, template);
    }


  }
};
