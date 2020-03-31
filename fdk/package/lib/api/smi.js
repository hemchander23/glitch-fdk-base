'use strict';

const configUtil = require('../utils/config-util');
const eventHandler = require('../event_handler/framework');

const CATEGORY_NAME = 'request';

function iParamConfigs() {
  return configUtil.getValuesForLocalTesting();
}

function checkCustomInstallPage() {
  return configUtil.getCustomIparamState() === 'install';
}

module.exports = {
  invoke: (req, res) => {
    const options = {
      categoryName: CATEGORY_NAME,
      categoryArgs: {
        methodName: req.body.methodName,
        methodParams: Object.assign(req.body.methodParams, {
          iparams: iParamConfigs(),
          isInstall: checkCustomInstallPage()
        })
      }
    };

    req.body = options;
    req.timeout = 5000;
    eventHandler(req, res);
  }
};
