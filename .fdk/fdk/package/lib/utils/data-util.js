'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs');
const helper = require('./helper-util');
const httpUtil = require('./http-util');
const nsUtil = require('./file-util').nsresolver;
const cryptoUtil = helper.crypto;
const errorUtil = require('./error-util');
const MILLI_SECONDS = 1000;
const BYTE_SIZE = 1024;
const MAX_SIZE = 8;
const SET_IF_NOT_EXIST = 'not_exist';

const CustomError = errorUtil.CustomError;
const ConditionFailure = 'The setIf conditional request failed';
const ERROR_MESSAGE = 'Mandatory attributes missing';
const INVALID_PATH = 'One or more paths in the attributes are invalid or overlapping with each other';
const INVALID_REMOVE_KEY = 'The specified key for remove operation does not exist in the data store';
const ITEM_SIZE_EXCEPTION = 'Item size exceeded the maximum limit of 8 KB';

class DataStore {
  constructor(args = {}) {
    this.file = args.file || 'localstore';
    this.location = args.location;
  }

  getDataStoreFolder() {
    return this.location || `${process.cwd()}/.fdk/`;
  }

  getDataStoreFile() {
    return `${this.getDataStoreFolder()}${this.file}`;
  }

  readLocalStore() {
    let jsonData;

    try {
      if (!fs.existsSync(this.getDataStoreFolder())) {
        fs.mkdirSync(this.getDataStoreFolder());
      }
      jsonData = JSON.parse(fs.readFileSync(this.getDataStoreFile()));
      debuglog(`Read ${JSON.stringify(jsonData)}`);
    }
    catch (e) {
      debuglog(`Error while reading localstore ${e.message}`);
      jsonData = {};
    }
    return jsonData;
  }

  epochTtl(ttl) {
    var ttlFloat = parseFloat(ttl);
    var epochTime = Date.now() + ttlFloat * MILLI_SECONDS;

    return epochTime;
  }

  conditionFailedException() {
    throw new CustomError({
      message: ConditionFailure,
      code: httpUtil.status.bad_request
    });
  }

  validateConditionExpression(key, jsonData, options) {
    if (options.setIf === SET_IF_NOT_EXIST) {
      if (key in jsonData) {
        return this.conditionFailedException();
      }
    }
    else if (!(key in jsonData)) {
      return this.conditionFailedException();
    }
  }

  increment(dbKey, attributes, jsonData) {
    for (var key in attributes) {
      if (!jsonData[dbKey][key]) {
        jsonData[dbKey][key] = attributes[key];
      }
      else {
        if (typeof jsonData[dbKey][key] !== 'number') {
          throw new CustomError({
            message: ERROR_MESSAGE,
            code: httpUtil.status.bad_request
          });
        }
        jsonData[dbKey][key] = jsonData[dbKey][key] + attributes[key];
      }
    }
    return jsonData;
  }

  append(dbKey, attributes, jsonData) {
    for (var key in attributes) {
      if (!jsonData[dbKey][key]) {
        jsonData[dbKey][key] = attributes[key];
      }
      else {
        if (!Array.isArray(jsonData[dbKey][key])) {
          throw new CustomError({
            message: ERROR_MESSAGE,
            code: httpUtil.status.bad_request
          });
        }
        jsonData[dbKey][key] = [...jsonData[dbKey][key], ...attributes[key]];
      }
    }
    return jsonData;
  }

  set(dbKey, attributes, jsonData) {
    if (!jsonData[dbKey]) {
      jsonData[dbKey] = {};
    }
    const itemSize = (helper.objsize(attributes) + helper.objsize(jsonData[dbKey])) / BYTE_SIZE;

    if (itemSize > MAX_SIZE) {
      throw new CustomError({
        message: ITEM_SIZE_EXCEPTION,
        code: httpUtil.status.bad_request
      });
    }

    var originalItemClone = JSON.parse(JSON.stringify(jsonData[dbKey]));

    for (var path in attributes) {
      var item = jsonData[dbKey];
      var dupeItem = originalItemClone;

      //split the path into individual attributes to iterate over the item
      var pathArray = path.split(/\.|\[|\]/).filter(attr => attr !== '');

      //Iterate through the specified path and set the value
      pathArray.forEach(function (val, index, pathArray) {
        //check if the path is valid and does not overlap with another path
        if (!item || !dupeItem) {
          throw new CustomError({
            message: INVALID_PATH,
            code: httpUtil.status.bad_request
          });
        }
        else if (pathArray.length !== index + 1) {
          item = item[val];
          dupeItem = dupeItem[val];
        }
        else if (Array.isArray(item) && item.length < val) {
          item.push(attributes[path]);
        }
        else {
          item[val] = attributes[path];
        }
      });
    }
    return jsonData;
  }

  remove(dbKey, attributes, jsonData) {
    if (!jsonData[dbKey]) {
      throw new CustomError({
        message: INVALID_REMOVE_KEY,
        code: httpUtil.status.bad_request
      });
    }
    attributes.forEach(function (path) {
      var obj = jsonData[dbKey];
      var pathArray = path.split(/\.|\[|\]/).filter(attr => attr !== '');
      //Iterate through the specified path and remove the attribute

      pathArray.forEach(function (val, index, pathArray) {
        if (!obj[val] && pathArray.length !== index + 1) {
          throw new CustomError({
            message: INVALID_PATH,
            code: httpUtil.status.bad_request
          });
        }
        else if (pathArray.length !== index + 1) {
          obj = obj[val];
        }
        else if (Array.isArray(obj)) {
          obj.splice(val, 1);
        }
        else {
          delete obj[val];
        }
      });
    });
    return jsonData;
  }

  store(key, data, options = {}) {
    var jsonData = this.readLocalStore();

    if ('setIf' in options) {
      this.validateConditionExpression(key, jsonData, options);
    }
    if ('ttl' in options && options.ttl > 0) {
      data.__expireAfter = this.epochTtl(options.ttl); //eslint-disable-line no-underscore-dangle
    }
    jsonData[key] = data;
    fs.writeFileSync(this.getDataStoreFile(), JSON.stringify(jsonData));
    return { 'Created': true };
  }

  fetch(key) {
    const jsonData = this.readLocalStore();
    const data = jsonData[key];

    if (data && data.__expireAfter) { //eslint-disable-line no-underscore-dangle
      if (Date.now() < data.__expireAfter) { //eslint-disable-line no-underscore-dangle
        return jsonData[key];
      }
      delete jsonData[key];
      fs.writeFileSync(this.getDataStoreFile(), JSON.stringify(jsonData));
      return jsonData[key];
    }
    return jsonData[key];
  }

  update(dbKey, action, attributes) {
    var jsonData = this.readLocalStore();

    if (!jsonData[dbKey] && action !== 'set' && action !== 'remove') {
      attributes = Object.assign(attributes, {
        createdAt: helper.getTimestamp(), updatedAt: helper.getTimestamp()
      });
      jsonData[dbKey] = attributes;
    }
    else {
      jsonData = this[`${action}`](dbKey, attributes, jsonData);
      jsonData[dbKey].updatedAt = helper.getTimestamp();
    }
    fs.writeFileSync(this.getDataStoreFile(), JSON.stringify(jsonData));
    return { 'Updated': true };
  }

  delete(key) {
    var jsonData = this.readLocalStore();

    delete jsonData[key];
    fs.writeFileSync(this.getDataStoreFile(), JSON.stringify(jsonData));
    return { 'Deleted': true };
  }
}

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
  const access_token = req.body.tokens.access_token ? cryptoUtil.decryptToken(req.body.tokens.access_token) : '';
  const refresh_token = req.body.tokens.refresh_token ? cryptoUtil.decryptToken(req.body.tokens.refresh_token) : '';

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

function fetchState() {
  try {
    return storage.fetch(stateNamespace());
  }
  catch (err) {
    return err;
  }
}


function fetchIparams() {
  try {
    return storage.fetch(iparamsNamespace());
  }
  catch (err) {
    return err;
  }
}

module.exports = {
  DataStore,
  oauth: {
    storeState,
    fetchState,
    storeIparams,
    fetchIparams,
    storeCredentials,
    fetchCredentialsForAccount,
    fetchCredentialsForAgent
  }
};
