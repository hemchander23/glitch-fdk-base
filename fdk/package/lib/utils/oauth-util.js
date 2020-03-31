'use strict';

const nsUtil = require('../utils/ns-resolver');
const DataStore = require('../utils/data-store');
const cryptoUtil = require('./crypto-util');

const storage = new DataStore({});

function keyNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth`;
}

function stateNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth_appstate`;
}

function iparamsNamespace() {
  return `${nsUtil.getNamespace()['app_id']}_oauth_iparams`;
}

function fetchCredentialsForAccount() {
  try {
    return storage.fetch(keyNamespace());
  }
  catch (err) {
    return err;
  }
}

function fetchCredentialsForAgent(req) {
  const access_token = req.body.tokens.access_token ? cryptoUtil.decryptToken(req.body.tokens.access_token):'';
  const refresh_token = req.body.tokens.refresh_token ? cryptoUtil.decryptToken(req.body.tokens.refresh_token):'';

  return {
    access_token,
    refresh_token
  };
}

function storeCredentials(data) {
  try {
    storage.store(keyNamespace(), data);
  }
  catch (err) {
    return err;
  }
}

function storeState(data) {
  try {
    storage.store(stateNamespace(), data);
  }
  catch (err) {
    return err;
  }
}

function storeIparams(data) {
  try {
    storage.store(iparamsNamespace(), data);
  }
  catch (err) {
    return err;
  }
}

function fetchState(){
  try {
    return storage.fetch(stateNamespace());
  }
  catch (err) {
    return err;
  }
}


function fetchIparams(){
  try {
    return storage.fetch(iparamsNamespace());
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