'use strict';

const jQueryDeferred = require('jquery-deferred');
const request = require('requestretry');

const httpUtil = require('../../utils/http-util');

const DP_ROUTER_URL = 'http://localhost:3000/dprouter';

const RETRY_STRATEGY=request.RetryStrategies.HTTPOrNetworkError;

const MESSAGES = {
  network_error: 'Error in establishing connection',
  timeout_error: 'Timeout error while processing the request'
};
const TIMEOUT_RESP = {
  status: httpUtil.status.gateway_timeout,
  headers: {},
  response: MESSAGES.timeout_error,
  errorSource: global.APP_SOURCE
};
const NETWORK_ERR_RESP = {
  status: httpUtil.status.bad_gateway,
  headers: {},
  response: MESSAGES.network_error,
  errorSource: global.APP_SOURCE
};
const TIMEOUT_CODE = 'ETIMEDOUT';
const SOCKET_TIMEOUT = 'ESOCKETTIMEDOUT';
const REQUEST_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete'
];

class Request {
  constructor(requestParams) {
    // eslint-disable-next-line new-cap
    this.requestDefer = jQueryDeferred.Deferred();
    this.requestParams = requestParams;
    this.refreshed = false;
  }

  handleRequestError(err) {
    const errResp = (err.code === TIMEOUT_CODE || err.code === SOCKET_TIMEOUT)
      ? TIMEOUT_RESP : NETWORK_ERR_RESP;

    this.requestDefer.reject(errResp);
  }

  handleRequestResponse(response, body) {
    if (body.status === httpUtil.status.unauthorized &&
      this.requestParams.isOAuth && !this.refreshed) {
      request({
        method: 'POST',
        url: DP_ROUTER_URL,
        headers: { 'mkp-route' : 'oauth' },
        json: { action: 'refresh'},
        maxAttempts: 1,
        retryDelay: 0,
        retryStrategy: RETRY_STRATEGY
      }, (err, resp, body) => {
        if (err) {
          return this.requestDefer.reject(err);
        }

        if (body && (body.status === httpUtil.status.bad_request ||
           body.status === httpUtil.status.information_error)) {
          return this.requestDefer.reject(body);
        }

        this.refreshed = true;

        return this.makeRequest();
      });
    }
    else {
      if (body.status >= httpUtil.status.bad_request) {
        return this.requestDefer.reject(body);
      }

      this.requestDefer.resolve(body);
    }
  }

  makeRequest() {
    request({
      url: DP_ROUTER_URL,
      method: 'POST',
      headers: { 'mkp-route': 'proxy' },
      json: {
        data: this.requestParams,
        action: 'execute'
      },
      maxAttempts: 1,
      retryDelay: 0,
      retryStrategy: RETRY_STRATEGY
    }, (err, response, body) => {
      if (err) {
        return this.handleRequestError(err);
      }
      return this.handleRequestResponse(response, body);
    });

    return this.requestDefer.promise();
  }
}

class RequestApi {
  constructor() {
  }
}

REQUEST_METHODS.forEach((method) => {
  RequestApi.prototype[method] = (url, options) => {
    const requestParams = Object.assign({
      url,
      method
    }, options);

    return new Request(requestParams).makeRequest();
  };
});

module.exports = RequestApi;
