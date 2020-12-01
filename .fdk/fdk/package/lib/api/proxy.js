'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');
const request = require('requestretry');
const validator = require('validator');
const url = require('url');

const configUtil = require('../utils/config-util');
const helper = require('../utils/helper-util');
const httpUtil = require('../utils/http-util');
const oauth = require('../routes/oauth2');
const manifest = require('../manifest');

const TRIM_LENGTH = 100;

const MESSAGES = {
  network_error: 'Error in establishing connection',
  template_error: 'Error while substituting the templates',
  invalid_content_type: 'Unsupported content type',
  invalid_url_https: 'Invalid URL - Must be HTTPS',
  invalid_url_ip: 'Invalid URL - IP is disallowed',
  invalid_url_fqdn: 'Invalid URL - Must be FQDN'
};

const VALID_CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'text/html',
  'text/xml',
  'application/jsonp',
  'text/plain',
  'application/javascript',
  'application/vnd.api+json'
];

const MAX_ATTEMPTS = 5;
const MIN_ATTEMPTS = 1;
const MAX_RETRY_DELAY = 1500;
const MIN_RETRY_DELAY = 0;
const REQUEST_TIMEOUT = 5000;
const RETRY_STRATEGY = request.RetryStrategies.HTTPOrNetworkError;

/**
* Return bounded value
* @param {number} max Maximum value
* @param {number} min Minimum value
* @param {number} value Value to be bounded
* @returns {number} Bounded value
*/
function withinBounds(max, min, value) {
  if (_.isInteger(value)) {
    return Math.max(min, Math.min(max, value));
  }
  return min;
}

const errorSkeleton = {
  status: httpUtil.status.bad_request,
  headers: {},
  errorSource: APP_SOURCE
};

function getRequestOptions(reqOptions) {
  return Object.assign(reqOptions, {
    maxAttempts: withinBounds(MAX_ATTEMPTS, MIN_ATTEMPTS, reqOptions.maxAttempts),
    retryDelay: withinBounds(MAX_RETRY_DELAY, MIN_RETRY_DELAY, reqOptions.retryDelay),
    retryStrategy:RETRY_STRATEGY,
    timeout:REQUEST_TIMEOUT
  });
}


function isValidContentType(response) {
  const headers = response.headers;
  const contentType = headers['content-type'] ? headers['content-type'].split(';')[0] : null;

  debuglog(`Looking for "${contentType}" in ${VALID_CONTENT_TYPES}`);

  if (contentType && !VALID_CONTENT_TYPES.includes(contentType)) {
    return false;
  }

  return true;
}

function validateUrl(requestURL) {
  const urlObj = url.parse(requestURL);

  debuglog(`Parsed ${requestURL} as ${JSON.stringify(urlObj)}`);

  if (urlObj.protocol !== 'https:') {
    throw Object.assign({
      response: MESSAGES.invalid_url_https
    }, errorSkeleton);
  }

  if (validator.isIP(urlObj.hostname)) {
    throw Object.assign({
      response: MESSAGES.invalid_url_ip
    }, errorSkeleton);
  }

  if (!validator.isFQDN(urlObj.hostname)) {
    throw Object.assign({
      response: MESSAGES.invalid_url_fqdn
    }, errorSkeleton);
  }
}

function fetchOauthConfigs(req) {
  const oauthCredential = oauth.fetchCredentials(req, req.meta.product) || {};
  const oauthIparams = oauth.fetchOauthIparams(req.meta.product);

  return {
    access_token: oauthCredential.access_token,
    oauth_iparams: oauthIparams || {}
  };
}

function templatize(req) {
  const reqOptions = req.body.data;
  const templates = Object.assign({
    iparam: configUtil.getValuesForLocalTesting(req.meta.product),
    oauth_iparams: {}
  }, helper.templateMethods);

  debuglog(`Substituing Templates ${JSON.stringify(reqOptions)} with ${JSON.stringify(templates)}`);

  if (((manifest.features.includes('agent_oauth') && req.body.tokens) ||
    manifest.features.includes('oauth')) &&
    req.body.data.isOAuth) {

    const oauthTokens = fetchOauthConfigs(req);

    Object.assign(templates, oauthTokens);
    debuglog(`Extending template values with oauth tokens and params ${JSON.stringify(oauthTokens)}`);
  }

  try {
    return JSON.parse(_.template(JSON.stringify(reqOptions))(templates));
  }
  catch (err) {
    debuglog(`Template substitution errored with ${err}`);
    throw Object.assign({
      response: MESSAGES.template_error
    }, errorSkeleton);
  }
}

module.exports = {
  execute: (req, res) => {

    let reqOptions = null;
    let validatedOpts = null;

    try {
      reqOptions = templatize(req);
      validateUrl(reqOptions.url);
      validatedOpts = getRequestOptions(reqOptions);
    }
    catch (err) {
      debuglog(`Proxy errored with ${err.message || err.response}`);
      return res.status(httpUtil.status.ok).send(err);
    }

    debuglog(`Making proxy call with options as ${JSON.stringify(reqOptions)}`);

    request(validatedOpts, function (error, response, responseBody) {
      debuglog(`Proxy came back with error as ${error && error.message}, body as ${(JSON.stringify(responseBody) || '').slice(0, TRIM_LENGTH)}`);

      if (error) {
        return res.status(httpUtil.status.ok).send({
          status: httpUtil.status.bad_gateway,
          headers: {},
          response: MESSAGES.network_error,
          errorSource: APP_SOURCE,
          attempts: error.attempts
        });
      }

      if (!isValidContentType(response)) {
        return res.status(httpUtil.status.ok).send({
          status: httpUtil.status.unsupported_media,
          headers: {},
          response: MESSAGES.invalid_content_type,
          errorSource: APP_SOURCE,
          attempts: response.attempts
        });
      }

      const responsePayload = {
        status: response.statusCode,
        headers: response.headers,
        response: responseBody,
        attempts: response.attempts
      };

      if (response.statusCode >= httpUtil.status.bad_request) {
        responsePayload.errorSource = APP_SOURCE;
      }

      res.status(httpUtil.status.ok).send(responsePayload);
    });
  }
};
