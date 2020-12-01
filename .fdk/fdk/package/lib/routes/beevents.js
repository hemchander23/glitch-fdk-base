'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');

const configUtil = require('../utils/config-util');
const eventHandler = require('../event_handler/framework');
const eventUtil = require('../utils/event-util');
const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');

const Router = require('express').Router;
const eventsRouter = new Router();

const PRODUCT_EVENTS_CATEGORY = 'productEvent';
const APP_EVENTS_CATEGORY = 'appEvent';
let tunnel = null;
/*
* Serves as list for waiting events and app setup events.
*/
const WAIT_FOR_RESPONSE_EVENTS = ['onAppInstall', 'onAppUninstall'];

const BAD_REQUEST_STATUS = 400;

const GATEWAY_TIMED_OUT = 504;

const HTTP_OK = 200;

const APP_SETUP_WAIT_TIME = 10000;

function iParamConfigs(product) {
  const iparams = configUtil.getValuesForLocalTesting(product);

  debuglog(`Using ${JSON.stringify(iparams)} as iparams for testing.`);

  return iparams;
}

function handleRequest(req, res) {

  const product = req.query.product || Object.keys(manifest.product)[0];

  if (!eventUtil.isValidEvent(product, req.query.name)) {
    const errorMsg = `Invalid event: ${req.query.name}`;

    console.log(errorMsg);
    res.status(BAD_REQUEST_STATUS).send({ message: errorMsg });
    return;
  }
  let methodParams = null;
  let testDataFilePath = `${process.cwd()}/server/test_data/${req.query.name}.json`;

  req.meta = {
    product: product
  };

  if (manifest.features.includes('omni')&& manifest.pfVersion !=='2.0') {
    req.meta.omni = true;
    testDataFilePath = `${process.cwd()}/server/test_data/${product}/${req.query.name}.json`;
  }
  if (eventUtil.manifestEvents) {
    req.meta.events = eventUtil.manifestEvents.events[product];
  }

  try {
    methodParams = JSON.parse(fileUtil.readFile(testDataFilePath));
    if (methodParams === null) {
      methodParams = {};
    }
  } catch (err) {
    debuglog(`The necessary file/s could not be loaded due to: ${err.message}`);
    methodParams = {};
  }

  if (req.query.name === 'onScheduledEvent' && !_.isEmpty(req.body)) {
    methodParams.data = req.body;
  }
  methodParams.iparams = iParamConfigs(product);
  methodParams.event = req.query.name;

  /**
   * If the request isn't originated from mock UI, add body & headers from the request.
   * This would be used for external events.
   */
  if (req.hook) {
    methodParams.data = req.body;
    methodParams.headers = req.headers;
  }

  const options = {
    /*
  Product events & External events are considered as productEvent
  App setup events are considered as appEvent
 */
    categoryName: WAIT_FOR_RESPONSE_EVENTS.includes(req.query.name)
      ? APP_EVENTS_CATEGORY : PRODUCT_EVENTS_CATEGORY,
    categoryArgs: {
      methodName: req.query.name,
      methodParams: methodParams
    }
  };

  req.body = options;

  debuglog(`Calling event handler with ${JSON.stringify(req.body)}`);

  eventHandler(req, res, tunnel);

  if (WAIT_FOR_RESPONSE_EVENTS.includes(req.query.name)) {
    setTimeout(() => {
      if (!res.headersSent) {
        console.log('`renderData` was not called in the callback within time limit!');
        res.status(GATEWAY_TIMED_OUT).send({ message: 'Request Timed Out!' });
      }
    }, APP_SETUP_WAIT_TIME);
  }
  else if (!res.headersSent) {
    res.status(HTTP_OK).json({ success: true });
  }
}

function externalEventTansformer(req, res) {

  const modifiedreq = {
    hook: true,
    body: req.body,
    headers: req.headers,
    query: {
      name: 'onExternalEvent',
      product: req.params.product
    }
  };

  if (manifest.pfVersion === '2.1' && Object.keys(manifest.product) > 0) {
    modifiedreq.query.product = req.params.product;
  }

  handleRequest(modifiedreq, res);
}

function acknowledgeCRC(req, res) {
  const response = eventUtil.getCRCResponse(req.method, req.headers, req.query);

  return res.status(response.status).send(response.body);
}

eventsRouter.get('/event/hook/:product', acknowledgeCRC);
eventsRouter.post('/event/hook/:product', externalEventTansformer);
eventsRouter.post('/event/execute', handleRequest);

eventsRouter.setTunnel = (tunnelURL) => {
  tunnel = tunnelURL;
};

module.exports = eventsRouter;
