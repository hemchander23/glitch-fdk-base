'use strict';

const DataStore = require('./data-util').DataStore;
const helper = require('./helper-util');
const nsUtil = require('./file-util').nsresolver;
const cryptoUtil = helper.crypto;

function keyNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth`;
}

function stateNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth_appstate`;
}

function iparamsNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth_iparams`;
}

function fetchbyProductNameSpace(product, nameSpace) {
  try {
    const productKey = nsUtil.getInternalNamespace('product_name', { product });
    const storage = new DataStore({ scope: productKey });

    return storage.fetch(nameSpace);
  }
  catch (err) {
    return err;
  }
}

function storeByProductNameSpace(data, nameSpace, product) {
  const productKey = nsUtil.getInternalNamespace('product_name', { product });
  const storage = new DataStore({ scope: productKey });

  return storage.store(nameSpace, data);
}

function fetchCredentialsForAccount(product) {
  try {
    return fetchbyProductNameSpace(product, keyNamespace());
  }
  catch (err) {
    return err;
  }
}

function fetchCredentialsForAgent(req) {
  const access_token = req.body.tokens.access_token ? cryptoUtil.decryptToken(req.body.tokens.access_token) : '';
  const refresh_token = req.body.tokens.refresh_token ? cryptoUtil.decryptToken(req.body.tokens.refresh_token) : '';

  return {
    access_token,
    refresh_token
  };
}

function storeCredentials(data, product) {
  try {
    storeByProductNameSpace(data, keyNamespace(), product);
  }
  catch (err) {
    return err;
  }
}

function storeState(data, product) {
  try {
    storeByProductNameSpace(data, stateNamespace(), product);
  }
  catch (err) {
    return err;
  }
}

function storeIparams(data, product) {
  try {
    storeByProductNameSpace(data, iparamsNamespace(), product);
  }
  catch (err) {
    return err;
  }
}

function fetchState(product) {
  try {
    return fetchbyProductNameSpace(product, stateNamespace());
  }
  catch (err) {
    return err;
  }
}


function fetchIparams(product) {
  try {
    return fetchbyProductNameSpace(product, iparamsNamespace());
  }
  catch (err) {
    return err;
  }
}

module.exports = {
  storeState,
  fetchState,
  storeIparams,
  fetchIparams,
  storeCredentials,
  fetchCredentialsForAccount,
  fetchCredentialsForAgent
};
