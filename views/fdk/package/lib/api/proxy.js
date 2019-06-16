'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');
const request = require('request');
const validator = require('validator');
const url = require('url');

const configUtil = require('../utils/config-util');
const helper = require('../utils/helper');
const httpUtil = require('../utils/http-util');
const oauth = require('../routes/oauth2');
const manifest = require('../manifest');

const TRIM_LENGTH = 100;

const MESSAGES= {
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
  'application/vnd.api+json'
];

const errorSkeleton = {
  status: httpUtil.status.bad_request,
  headers: {},
  errorSource: APP_SOURCE
};

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
  const oauthCredential = oauth.fetchCredentials(req) || {};
  const oauthIparams = oauth.fetchOauthIparams();

  return {
    access_token : oauthCredential.access_token,
    oauth_iparams : oauthIparams || {}
  };
}

function templatize(req) {
  const reqOptions = req.body.data;

  const templates = Object.assign({
    iparam: configUtil.getValuesForLocalTesting(),
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

    try {
      reqOptions = templatize(req);

      validateUrl(reqOptions.url);
    }
    catch (err) {
      debuglog(`Proxy errored with ${err.message || err.response}`);
      return res.status(httpUtil.status.ok).send(err);
    }

    debuglog(`Making proxy call with options as ${JSON.stringify(reqOptions)}`);

    return request(reqOptions, function(error, response, responseBody) {
      debuglog(`Proxy came back with error as ${error && error.message}, body as ${(JSON.stringify(responseBody) || '').slice(0, TRIM_LENGTH)}`);

      if (error) {
        return res.status(httpUtil.status.ok).send({
          status: httpUtil.status.bad_gateway,
          headers: {},
          response: MESSAGES.network_error,
          errorSource: APP_SOURCE
        });
      }

      if (!isValidContentType(response)) {
        return res.status(httpUtil.status.ok).send({
          status: httpUtil.status.unsupported_media,
          headers: {},
          response: MESSAGES.invalid_content_type,
          errorSource: APP_SOURCE
        });
      }

      const responsePayload = {
        status: response.statusCode,
        headers: response.headers,
        response: responseBody
      };

      if (response.statusCode >= httpUtil.status.bad_request) {
        responsePayload.errorSource = APP_SOURCE;
      }

      res.status(httpUtil.status.ok).send(responsePayload);
    });
  }
};
