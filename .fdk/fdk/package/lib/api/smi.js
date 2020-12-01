'use strict';

const configUtil = require('../utils/config-util');
const eventUtil = require('../utils/event-util');
const eventHandler = require('../event_handler/framework');

const CATEGORY_NAME = 'request';

function iParamConfigs(product) {
  return configUtil.getValuesForLocalTesting(product);
}

function checkCustomInstallPage(product) {
  return configUtil.getCustomIparamState(product) === 'install';
}

module.exports = {
  invoke: (req, res) => {
    const options = {
      categoryName: CATEGORY_NAME,
      categoryArgs: {
        methodName: req.body.methodName,
        methodParams: Object.assign(req.body.methodParams, {
          iparams: iParamConfigs(req.meta.product),
          isInstall: checkCustomInstallPage(req.meta.product)
        })
      }
    };

    req.body = options;
    req.timeout = 5000;

    if (eventUtil.manifestEvents) {
      req.meta.events = eventUtil.manifestEvents.events[req.meta.product];
    }
    eventHandler(req, res);
  }
};
