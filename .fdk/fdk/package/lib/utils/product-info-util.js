'use strict';

const os = require('os');
const DataStore = require('./data-util').DataStore;

const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});

const addonVersion = dbApi.fetch('version_details').addon.version;
const fdkconfig = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/product_info.json`);
const fdkProductSupport = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/locations/product_locations.json`);

function getProductDoc() {
  return fdkconfig.doc_urls;
}

function getTestLink() {
  return fdkconfig.test_urls;
}

function getAddonVersion() {
  return addonVersion;
}

function getProductList() {
  return fdkconfig.products;
}

function getDeployLink() {
  return fdkconfig.deploy_urls;
}

function getSupportedProducts() {
  return Object.keys(fdkProductSupport);
}

function getProductLocations(product) {
  const locArray = fdkProductSupport[product].location;
  const arr = [];

  locArray.forEach(x => arr.push({name: x}));
  return arr;
}

function getProductsMap() {
  return fdkconfig.products_map;
}

module.exports = {
  getProductDoc,
  getTestLink,
  getDeployLink,
  getProductList,
  getAddonVersion,
  getSupportedProducts,
  getProductLocations,
  getProductsMap
};
