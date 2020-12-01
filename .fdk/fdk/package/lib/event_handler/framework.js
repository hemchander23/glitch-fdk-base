'use strict';

/* eslint-disable no-underscore-dangle */

const fs = require('fs');
const vm = require('vm');
const _ = require('lodash');
const path = require('path');
const uuid = require('uuid');

const serverScriptPath = `${process.cwd()}/server/server.js`;

const coverageUtil = require('../utils/coverage-util');
const httpUtil = require('../utils/http-util');
const RequestAPI = require('./features/request');
const ScheduleAPI = require('./features/schedule');
const DBAPI = require('./features/db');
const HookAPI = require('./features/hook');

const INVALID_DATA_ERR_MSG = 'The error should be a JSON Object with a message or a status parameter.';
const TIMEOUT_ERR_MSG = 'Timeout error while processing the request.';
const FW_ERROR_MSG = 'Error while executing App server script!';

let tunnel = null;

function createModuleError(modulePath) {
  const error = new Error(`Cannot find module "${modulePath}"`);

  error.code = 'MODULE_NOT_FOUND';
  return error;
}

function loadDependency(dpn) {
  if (dpn.startsWith('./') || dpn.startsWith('../')) {
    dpn = path.basename(dpn);
  }
  return require(`${process.cwd()}/server/node_modules/${dpn}`);
}

function getFeatures(self) {
  const enabledFeatures = {};
  const isInstall = self.event.categoryArgs.methodParams.isInstall;

  if (!isInstall) {
    enabledFeatures.generateTargetUrl = options => {
      return new HookAPI(self).generateTargetUrl(options, tunnel);
    };
    enabledFeatures.$schedule = new ScheduleAPI(self);
    enabledFeatures.$db = new DBAPI(self);
  }
  enabledFeatures.$request = new RequestAPI();
  return enabledFeatures;
}

const APP_EVENT_TIMEOUT = 10000,
  PRODUCT_EVENT_TIMEOUT = 20000,
  SMI_TIMEOUT = 5000;

class Framework {

  constructor(event, req, res) {
    const self = this;

    this.event = event;
    this.req = req;
    this.res = res;
    this.product = req.meta.product;
    this.cachedModules = {};
    this.nestedPath = [`${process.cwd()}/server/`];

    this.serverScript = coverageUtil.instrument(serverScriptPath);
    /**
      We are running the developers code in the sandbox.
      By running in sandbox, we allow the user to only use certain methods.
      We use require to load the node modules [in loadDependency] as it contains the methods, which are outside of the context.
    */
    this.sandboxAPI = _.extend({
      __fdkcoverage__: {},
      exports: module.exports,
      console: {
        log: console.log,
        info: console.info,
        error: console.error
      },
      require: (relativePath) => {
        let script,
          exported,
          basePath,
          fullPath;

        if (relativePath.startsWith('./') || relativePath.startsWith('../')) {
          basePath = path.resolve.apply(null, this.nestedPath);
          fullPath = path.normalize(`${basePath}/${relativePath}.js`);

          if (self.cachedModules.hasOwnProperty(fullPath)) {
            return self.cachedModules[fullPath];
          }

          if (!fullPath.startsWith(path.resolve(`${process.cwd()}/server/`))) {
            throw createModuleError(relativePath);
          }

          if (!fs.existsSync(fullPath)) {
            throw createModuleError(relativePath);
          }

          script = coverageUtil.instrument(fullPath);

          this.nestedPath.push(path.dirname(relativePath));
          exported = self.sandboxExecutor(script);

          this.nestedPath.pop();
          self.cachedModules[fullPath] = exported;

          return exported;
        }

        return loadDependency(relativePath);
      },
      process: {
        cwd: function () {
          return `${process.cwd()}/server`;
        }
      }
    }, getFeatures(self, req));

    (() => {
      let previous;
      const INTERVAL_MS = 500;

      setInterval(() => {
        const current = JSON.stringify(self.sandboxAPI.__fdkcoverage__);

        if (previous !== current) {
          coverageUtil.update(self.sandboxAPI.__fdkcoverage__);
          previous = current;
        }
      }, INTERVAL_MS).unref();
    })();

    // When the developer doesn't use renderData then we don't return the requestID in response. It would be an empty success response.
    _.extend(this.sandboxAPI, {
      renderData: (error, output) => {
        try {
          let returnVal = null;
          let statusCode = 200;
          const requestID = self.req.RequestId;
          let showInUI = false;

          if (error) {
            let response = {};

            if (_.isArray(error) || !(_.isObject(error)) ||
              (_.isUndefined(error.message) && !error.status)) {
              statusCode = httpUtil.status.bad_request;
              response = {
                status: statusCode,
                message: INVALID_DATA_ERR_MSG,
                errorSource: APP_SOURCE
              };
            }
            else {
              if (_.isUndefined(error.message)) {
                error.message = null;
              }
              statusCode = error.status || httpUtil.status.internal_server_error;
              response = {
                status: statusCode,
                message: error.message,
                errorSource: APP_SOURCE
              };
              showInUI = true;
            }
            returnVal = _.extend({
              requestID: requestID
            }, response);
          }
          else {
            returnVal = {
              requestID: requestID
            };
            if (!_.isUndefined(output)) {
              returnVal = _.extend({
                requestID: requestID
              }, {
                response: output
              });
            }
          }

          self.res.header('showinui', showInUI);
          self.res.status(statusCode).json(returnVal);
        }
        catch (e) {
          console.log(e);
        }
      }
    });
    this.sandboxAPI.global = this.sandboxAPI;

    // eslint-disable-next-line new-cap
    this.contextifiedGlobal = new vm.createContext(this.sandboxAPI);
  }

  getMethodName() {
    return this.event.categoryArgs.methodName;
  }

  getMethodArgs() {
    return this.event.categoryArgs.methodParams;
  }

  execute(methodName, args) {
    const jsonArgs = JSON.stringify(args || {});
    const executorScript = `__svrScript['${methodName}'](${jsonArgs})`;

    _.extend(this.contextifiedGlobal, { __svrScript: this.svrExecScript });
    this.sandboxExecutor(executorScript);
  }

  sandboxExecutor(script) {
    const serverScript = this.constructScript(script);

    return serverScript.runInContext(this.contextifiedGlobal, { timeout: this.event.timeout });
  }

  constructScript(script) {
    script = `(function() {var exports = {}; ${script}; return exports;})()`;
    return new vm.Script(script, {
      filename: 'server.js'
    });
  }

  handleError(err) {
    console.log(err);
    const output = {
      requestID: this.req.RequestId,
      status: httpUtil.status.internal_server_error,
      message: `${FW_ERROR_MSG} - ${err.message}`,
      errorSource: APP_SOURCE
    };

    this.res.status(httpUtil.status.ok).json(output);
  }

}

class Request extends Framework {

  constructor(event, req, res) {
    event.timeout = event.timeout || SMI_TIMEOUT;
    super(event, req, res);
  }

  execute() {
    try {
      const self = this;
      const TIMEOUT_MS = 5000;

      setTimeout(() => {
        if (!self.res._headerSent) {
          self.res.status(httpUtil.status.ok).json({
            status: httpUtil.status.gateway_timeout,
            message: TIMEOUT_ERR_MSG,
            errorSource: APP_SOURCE
          });
        }
      }, TIMEOUT_MS);
      super.execute(this.getMethodName(), this.getMethodArgs());
    }
    catch (err) {
      this.handleError(err);
    }
  }

}

class Event extends Framework {

  constructor(event, req, res) {
    super(event, req, res);
  }

  getMethodName() {
    const methodName = super.getMethodName();
    let events = null;
    let callbackEvent = null;
    const errorString = `${methodName} is not configured`;

    events = this.req.meta.events || this.svrExecScript.events || [];
    if (this.req.meta.omni) {
      events = this.req.meta.events || [];
      if (_.isEmpty(events)) {
        throw new Error(`Events not configured for product ${this.req.meta.product}`);
      }
    }

    callbackEvent = events.find(event => {
      if (event.event === methodName) {
        return true;
      }
      return false;
    });

    if (callbackEvent) {
      return callbackEvent.callback;
    }

    if (this.req.meta && this.req.meta.omni) {
      throw new Error(`${errorString} for product ${this.req.meta.product}`);
    }
    throw new Error(errorString);
  }

  execute() {
    try {
      super.execute(this.getMethodName(), this.getMethodArgs());
    }
    catch (err) {
      this.handleError(err);
    }
  }
}

class ProductEvent extends Event {
  constructor(event, req, res) {
    event.timeout = event.timeout || PRODUCT_EVENT_TIMEOUT;
    super(event, req, res);
  }
}

class AppEvent extends Event {
  constructor(event, req, res) {
    event.timeout = event.timeout || APP_EVENT_TIMEOUT;
    super(event, req, res);
  }
}

function fetchEventObj(req, res) {
  const event = req.body;

  switch (req.body.categoryName) {
    case 'request':
      return new Request(event, req, res);
    case 'appEvent':
      return new AppEvent(event, req, res);
    case 'productEvent':
      return new ProductEvent(event, req, res);
  }
}

function handler(req, res, tunnelURL) {
  req.RequestId = `${uuid.v4()}`;
  tunnel = tunnelURL;

  if (req.body.categoryName) {
    try {
      const obj = fetchEventObj(req, res);

      obj.svrExecScript = obj.sandboxExecutor(obj.serverScript);
      obj.execute();
    }
    catch (err) {
      console.log(err);
      const output = {
        requestID: req.RequestId,
        status: httpUtil.status.internal_server_error,
        message: `${FW_ERROR_MSG} - ${err.message}`,
        errorSource: APP_SOURCE
      };

      res.status(httpUtil.status.ok).json(output);
    }
  }
  else {
    const output = {
      requestID: req.RequestId,
      status: httpUtil.status.internal_server_error,
      message: FW_ERROR_MSG,
      errorSource: PLATFORM_SOURCE
    };

    res.status(httpUtil.status.ok).json(output);
  }
}

module.exports = handler;
