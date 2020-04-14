'use strict';

const _ = require('lodash');
const jQueryDeferred = require('jquery-deferred');
const request = require('request');

const httpUtil = require('../../utils/http-util');

const SUCCESS_STATUS = [
  httpUtil.status.ok,
  httpUtil.status.created
];
const MISSING_ATTR_ERR = {
  message: 'Mandatory attributes (key or value) is missing',
  status: httpUtil.status.bad_request
};
const DPROUTER_URL = 'http://localhost:3000/dprouter';
const DB_FEATURE = 'db';
const POST = 'post';

function makeCall(body) {

  // eslint-disable-next-line new-cap
  const dbDeferred = jQueryDeferred.Deferred();

  if (body.action === 'store' && !body.data) {
    return dbDeferred.reject(MISSING_ATTR_ERR);
  }

  if (!body.dbKey) {
    return dbDeferred.reject(MISSING_ATTR_ERR);
  }

  request({
    method: POST,
    url: DPROUTER_URL,
    headers: {
      'MKP-ROUTE': DB_FEATURE
    },
    json: body
  }, (error, response, body) => {
    if (_.includes(SUCCESS_STATUS, response.statusCode)) {
      dbDeferred.resolve(body);
    }
    else {
      dbDeferred.reject(body);
    }
  });
  return dbDeferred;
}

module.exports = {
  set: (key, val, options={}) => {
    return makeCall({dbKey: key, data: val, action: 'store', options: options});
  },
  get: (key) => {
    return makeCall({dbKey: key, action: 'fetch'});
  },
  update: (key, type, attributes) => {
    return makeCall({dbKey: key, action: 'update', type, attributes});
  },
  delete: (key) => {
    return makeCall({dbKey: key, action: 'delete'});
  }
};
