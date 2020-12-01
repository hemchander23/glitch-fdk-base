'use strict';

const debuglog = __debug.bind(null, __filename);

const InMemoryDataStore = require('./InMemoryDataStore');

const stateStore = new InMemoryDataStore();

const fileUtil = require('./file-util');
const eventUtil = require('./event-util');
const manifest = require('../manifest');

const eventHandler = require(`${global.FDK_PATH}/lib/event_handler/framework`);

const APP_EVENT_TIMEOUT = 10000;

const appType = [];

function isPureBackend() {
  const appFolderPath = process.cwd() + '/app/';

  /*
    If the app is not a backend app, it can't be a pure backend app.
  */

  if (!manifest.features.includes('backend')) {
    return;
  }

  /*
    Even if one of the product contains location, it can't be a pure backend app.
  */
  if (Object.keys(manifest.product || {}).some(key => 'location' in manifest.product[key])) {
    return;
  }

  /*
    If the app has an app directory with files in it, it can't be a pure backend app.
  */
  if (fileUtil.fileExists(appFolderPath) && fileUtil.readDir(appFolderPath).length !== 0) {
    return;
  }

  return appType.push('purebackend');
}

function appClassifier() {
  [
    isPureBackend
  ].forEach(e => e());

  return appType;
}

function checkEventExists(eventName) {
  try {
    const { events } = eventUtil.getEventsList();

    return events.some(event => event.event === eventName);
  }
  catch (error) {
    return false;
  }
}

function generateStubResponse(eventName, product) {
  const stubResponse = {
    headers: {}
  };

  stubResponse.status = (code) => {
    stubResponse.statusCode = code;
    return stubResponse;
  };
  stubResponse.json = (json) => {
    stubResponse.response = json;
    stubResponse.response.statusCode = stubResponse.statusCode;
    stubResponse.response.status = stubResponse.response.status || 'SUCCESS';

    // async sending of response to client
    stateStore.set(`${eventName}_status_${product}`, 'done');
    stateStore.set(`${eventName}_response_${product}`, stubResponse);
    return stubResponse;
  };
  stubResponse.header = (key, value) => {
    stubResponse.headers[key] = value;
    return stubResponse;
  };

  return stubResponse;
}

function handleAfterTimeout(eventName, checksum, product) {
  if (!stateStore.check(`${eventName}_checksum_${product}`, checksum) ||
      !stateStore.check(`${eventName}_status_${product}`, 'in_progress')) {
    return;
  }
  stateStore.set(`${eventName}_status_${product}`, 'done');
  stateStore.set(`${eventName}_response_${product}`, {
    statusCode: 200,
    headers: {},
    response: {
      status: 'FAILED',
      statusCode: 200,
      message: ''
    }
  });
}

function prepopulateState(eventName, checksum, product) {
  stateStore.set(`${eventName}_checksum_${product}`, checksum);
  stateStore.set(`${eventName}_status_${product}`, 'in_progress');
  stateStore.set(`${eventName}_response_${product}`, {
    statusCode: 200,
    headers: {},
    response: {
      status: 'IN_PROGRESS',
      statusCode: 202,
      message: ''
    }
  });
}

function eventParams(eventName, requestBody) {
  const params = JSON.parse(fileUtil.readFile(`${process.cwd()}/server/test_data/${eventName}.json`));

  params.timestamp = new Date().getTime();
  params.iparams = requestBody.configs || {};

  return params;
}

function executeEvent(eventName, requestBody, res, defaultBody, product) {
  const checksum = new Date().getTime();

  prepopulateState(eventName, checksum, product);

  if (!checkEventExists(eventName)) {
    debuglog(`App Event not found : ${eventName}`);

    stateStore.set(`${eventName}_status_${product}`, 'done');
    stateStore.remove(`${eventName}_response_${product}`);
    stateStore.remove(`${eventName}_checksum_${product}`);

    return res.send(defaultBody);
  }
  const stubResponse = generateStubResponse(eventName, product);

  setTimeout(() => handleAfterTimeout(eventName, checksum, product), APP_EVENT_TIMEOUT);

  eventHandler({
    meta:{
      product: product
    },
    body: {
      categoryName: 'appEvent',
      categoryArgs: {
        methodName: eventName,
        methodParams: eventParams(eventName, requestBody)
      }
    }
  }, stubResponse);

  return res.send({
    ...defaultBody,
    statusCode: 202
  });
}

function checkAppEventStatus(eventName, res, product) {
  const { statusCode, response, headers } = stateStore.get(`${eventName}_response_${product}`);

  res.status(statusCode);
  for (const [key, value] of Object.entries(headers)) {
    res.set(key, value);
  }

  return res.send(response);
}

module.exports = {
  appClassifier,
  executeEvent,
  checkAppEventStatus,
  stateStore
};
