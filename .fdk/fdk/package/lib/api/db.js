'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');
const DataStore = require('../utils/data-util').DataStore;
const helper = require('../utils/helper-util');
const httpUtil = require('../utils/http-util');
const nsUtil = require('../utils/file-util').nsresolver;
const errorUtil = require('../utils/error-util');
const CustomError = errorUtil.CustomError;
const constants = require('../validations/constants');
const MESSAGES = {
  store_error: 'Failed to store data',
  fetch_error: 'Failed to fetch data',
  update_error: 'Failed to update data',
  delete_error: 'Failed to delete data',
  blank_key_error: 'The key cannot be blank',
  blank_value_error: 'The value cannot be blank and should be of type JSON',
  blank_attribute_error: 'Attributes object cannot be empty and should be of type JSON or Array',
  key_length_error: 'Key length should not exceed 30 characters',
  object_size_error: 'The combined size of the key and value should not exceed 8KB',
  record_not_found: 'Record not found',
  mandatory_attrib_missing: 'Mandatory attributes Missing',
  ttl_type_error: 'Time to live(ttl) should be of type float and a non-zero value',
  invalid_setIf_value: 'setIf can only take two values: "exist" or "not_exist"',
  invalid_increment_value: 'The value passed to increment should be of type number',
  invalid_append_value: 'The value passed to append should be of type array and should not be an empty array',
  invalid_remove_attributes: 'The attributes object passed to remove action should be of type array',
  invalid_attribute_key: 'Keys or paths inside attributes object cannot be blank'
};
const KEY_LENGTH = 30;
const BYTE_SIZE = 1024;
const MAX_SIZE = 8;
const optionsKeys = ['ttl', 'setIf'];
const SET_IF = ['exist', 'not_exist'];

const dbApi = new DataStore({});

function isBlank(val) {
  return (_.isNumber(val) || _.isBoolean(val)) ? _.isEmpty(String(val)) : _.isEmpty(val);
}

function fetchKey(key, req) {
  const product = req.meta.product;

  return `${nsUtil.getRootFolder()}:${key}_${product}`;
}

function isAnyKeyEmpty(entity) {
  function isObject() {
    return entity && entity.constructor === Object;
  }

  if (isObject(entity)) {
    const keys = Object.keys(entity);

    if (keys.includes('')) {
      return true;
    }

    return keys.some(k => isAnyKeyEmpty(entity[k]));
  }

  if (Array.isArray(entity)) {
    return entity.some(isAnyKeyEmpty);
  }

  return false;
}

function replaceWithNull(entity) {
  if (entity === null || entity === undefined) {
    return entity;
  }

  const constructor = entity.constructor;

  if (constructor === Object || constructor === Array) {
    Object.keys(entity).forEach(e => {
      entity[e] = replaceWithNull(entity[e]);
    });
    return entity;
  }

  if (constructor === Number) {
    if (isNaN(entity) || !isFinite(entity)) {
      return null;
    }
    return entity;
  }

  if (constructor === String) {
    if (entity === '') {
      return null;
    }
    return entity;
  }

  return entity;
}

function normalizeItem(data) {
  const dupData = {};

  for (const key in data) {
    if (!isBlank(key)) {
      dupData[key] = data[key];
    }
  }

  if (_.isEmpty(dupData)) {
    throw new CustomError({
      message: MESSAGES.mandatory_attrib_missing,
      code: httpUtil.status.bad_request
    });
  }
  if (isAnyKeyEmpty(dupData)) {
    throw new CustomError({
      message: MESSAGES.mandatory_attrib_missing,
      code: httpUtil.status.bad_request
    });
  }

  return replaceWithNull(dupData);
}

function checkDataSize(data) {
  const keys = _.keys(data);

  for (let i = 0; i < keys.length; i++) {
    if (keys[i].length > KEY_LENGTH) {
      return true;
    }
  }
  return false;
}

function validateKey(key, data={}, isAttributes = false) {
  if (isBlank(key)) {
    throw new CustomError({
      message: isAttributes ? MESSAGES.invalid_attribute_key : MESSAGES.blank_key_error,
      code: httpUtil.status.bad_request
    });
  }
  if (key.length > KEY_LENGTH || checkDataSize(data)) {
    throw new CustomError({
      message: MESSAGES.key_length_error,
      code: httpUtil.status.bad_request
    });
  }
}

function validateData(data){
  if (isBlank(data)) {
    throw new CustomError({
      message: MESSAGES.blank_value_error,
      code: httpUtil.status.bad_request
    });
  }
  if (!_.isObject(data)) {
    throw new CustomError({
      message: MESSAGES.blank_value_error,
      code: httpUtil.status.unprocessable_entity
    });
  }
  if (helper.objsize(data)/BYTE_SIZE > MAX_SIZE) {
    throw new CustomError({
      message: MESSAGES.object_size_error,
      code: httpUtil.status.bad_request
    });
  }
}

function validateOptions(options) {
  for (var key in options) {
    if (!optionsKeys.includes(key)) {
      throw new CustomError({
        message: `Invalid option ${key} inside options`,
        code: httpUtil.status.bad_request
      });
    }
    if (key === 'ttl' && !parseFloat(options.ttl)) {
      throw new CustomError({
        message: MESSAGES.ttl_type_error,
        code: httpUtil.status.bad_request
      });
    }
    if (key === 'setIf' && SET_IF.indexOf(options.setIf) < 0) {
      throw new CustomError({
        message: MESSAGES.invalid_setIf_value,
        code: httpUtil.status.unprocessable_entity
      });
    }
  }
}

function validate(dbKey, data, options={}) {
  validateKey(dbKey, data);
  validateData(data);
  validateOptions(options);
}

function validateAction(action) {
  for (const key in constants.actions) {
    if (constants.actions[key] === action){
      return;
    }
  }
  throw new CustomError({
    message: `Invalid action ${action} for update`,
    code: httpUtil.status.bad_request
  });
}

function validateAttributes(attributes) {
  if (isBlank(attributes)) {
    throw new CustomError({
      message: MESSAGES.blank_attribute_error,
      code: httpUtil.status.bad_request
    });
  }
  if (!_.isObject(attributes)) {
    throw new CustomError({
      message: MESSAGES.blank_attribute_error,
      code: httpUtil.status.bad_request
    });
  }
}

const updateValidations = {
  increment: function(attributes) {
    for (const key in attributes) {
      validateKey(key, {}, true);
      if (typeof attributes[key] !== 'number') {
        throw new CustomError({
          message: MESSAGES.invalid_increment_value,
          code: httpUtil.status.bad_request
        });
      }
    }
  },
  append: function(attributes) {
    for (const key in attributes) {
      validateKey(key, {}, true);
      if (!Array.isArray(attributes[key]) || _.isEmpty(attributes[key])) {
        throw new CustomError({
          message: MESSAGES.invalid_append_value,
          code: httpUtil.status.bad_request
        });
      }
    }
  },
  set: function(attributes) {
    for (const path in attributes) {
      if (isBlank(path)) {
        throw new CustomError({
          message: MESSAGES.invalid_attribute_key,
          code: httpUtil.status.unprocessable_entity
        });
      }
    }
  },
  remove: function(attributes) {
    if (!Array.isArray(attributes)) {
      throw new CustomError({
        message: MESSAGES.invalid_remove_attributes,
        code: httpUtil.status.bad_request
      });
    }
    attributes.forEach(function(path){
      if (isBlank(path)) {
        throw new CustomError({
          message: MESSAGES.invalid_attribute_key,
          code: httpUtil.status.unprocessable_entity
        });
      }
    });
  }
};

function validateUpdateAction(dbKey, action, attributes) {
  validateKey(dbKey, attributes);
  validateAction(action);
  validateAttributes(attributes);
  updateValidations[action](attributes);
}


module.exports = {

  store: (req, res) => {
    try {
      let key = req.body.dbKey;
      let data = req.body.data;

      const options = req.body.options || {};

      validate(key, data, options);
      key = fetchKey(key, req);
      data = _.assignIn(normalizeItem(data), {
        createdAt: helper.getTimestamp(), updatedAt: helper.getTimestamp()
      });
      const response = dbApi.store(key, data, options);

      debuglog(`Stored ${JSON.stringify(data)} with key ${key}`);

      res.status(httpUtil.status.created).send(response);
    }
    catch (err) {
      console.log(err.stack);
      if (err.code) {
        return res.status(err.code).send({
          message: err.message, status: err.code
        });
      }
      res.status(httpUtil.status.internal_server_error).send({
        message: MESSAGES.store_error
      });
    }
  },

  fetch: (req, res) => {
    const key = fetchKey(req.body.dbKey, req);
    const response = _.omit(dbApi.fetch(key), 'createdAt', 'updatedAt', '__expireAfter');

    if (_.isEmpty(response)) {
      return res.status(httpUtil.status.not_found).send({
        status: httpUtil.status.not_found,
        message: MESSAGES.record_not_found
      });
    }
    res.status(httpUtil.status.ok).send(response);
  },

  update: (req, res) => {
    try {
      let key = req.body.dbKey;
      const attributes = req.body.attributes;

      const action = req.body.type;

      validateUpdateAction(key, action, attributes);
      key = fetchKey(key, req);
      const response = dbApi.update(key, action, attributes);

      debuglog(`Updated ${JSON.stringify(attributes)} with key ${key}`);
      res.status(httpUtil.status.ok).send(response);
    }
    catch (err) {
      console.log(err.stack);
      if (err.code) {
        return res.status(err.code).send({
          message: err.message, status: err.code
        });
      }
      res.status(httpUtil.status.internal_server_error).send({
        message: MESSAGES.update_error
      });
    }
  },

  delete: (req, res) => {
    const key = fetchKey(req.body.dbKey, req);
    const reponse = dbApi.delete(key);

    res.status(httpUtil.status.ok).send(reponse);
  }
};
