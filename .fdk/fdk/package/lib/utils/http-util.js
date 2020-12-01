'use strict';

const url = require('url');

function enableCORS(res, req) {
  let allowedOrigin,
    allowedHeaders;

  if (req) {
    const refererHeader = req.header('referer') || req.header('origin') || '';
    const refererUrl = url.parse(refererHeader);

    allowedHeaders = req.header('Access-Control-Request-Headers') || '*';
    allowedOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, UPDATE, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', allowedHeaders || '*');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin || '*');
}

module.exports = {
  enableCORS,
  status: {
    // 2xx
    ok: 200,
    created: 201,
    no_content: 204,
    information_error: 210,

    // 3xx
    found: 302,

    // 4xx
    bad_request: 400,
    unauthorized: 401,
    not_found: 404,
    unsupported_media: 415,
    unprocessable_entity: 422,

    //5xx
    internal_server_error: 500,
    bad_gateway: 502,
    gateway_timeout: 504
  }
};
