'use strict';

const debuglog = __debug.bind(null, __filename);

const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const coverageUtil = require('../utils/coverage-util');
const configUtil = require('../utils/config-util');
const manifest = require('../manifest');
const oauth = require('../routes/oauth2');
const actionsUtil = require('../utils/actions-util');
const fileUtil = require('../utils/file-util');


const express = require('express');
const Router = express.Router;

const iframeRouter = new Router();
const staticMiddleware = express.static('./app');

const WSS_SCRIPT = `
  <script>
    var ws = new WebSocket('ws://localhost:10001/notify-change');
    ws.onmessage = function() {
      location.reload();
    };
  </script>
`;

function constructV2Response(req) {
  const currentProduct = req.query.product;

  if (!manifest.product[currentProduct]) {
    return [];
  }

  const locations = JSON.parse(JSON.stringify(manifest.product[currentProduct].location));

  function convertURLs(locations, oauth) {
    _.forEach(locations, (value) => {
      value.url = 'http://localhost:10001/iframe/' + (oauth || value.url);
    });
  }

  const appDetails = {
    id: 1,
    version_id: 1,
    configs: configUtil.getValuesForLocalTesting(currentProduct),
    displayName: process.cwd().split(path.sep).pop(),
    placeholders: locations
  };

  if (manifest.features.includes('oauth') && !_.has(oauth.fetchCredentials(req, currentProduct), 'access_token')) {
    convertURLs(appDetails.placeholders, 'oauth/local-testing-oauth-msg.html');
  } else {
    convertURLs(appDetails.placeholders);
  }

  return [ appDetails ];
}

function iframeAPIHandlerV2 (req, res) {
  const appDetails = constructV2Response(req);

  debuglog(`Responding to product with ${JSON.stringify(appDetails)}`);

  res.send(appDetails);
}

function iframeAPIHandler(req, res) {
  const product = req.query.product || Object.keys(manifest.product)[0];
  const appDetails = {
    configs: configUtil.getNonSecureValues(product),
    displayName: process.cwd().split(path.sep).pop(),
    product: manifest.product,
    features: manifest.features,
    actions: actionsUtil.actionsList().length > 0,
    omni: manifest.features.includes('omni'),
    products: Object.keys(manifest.product),
    platform: manifest.pfVersion
  };

  if (manifest.features.includes('oauth') && oauth.isNotAgent()) {
    let isAuthorized = false;

    if (_.has(oauth.fetchCredentials(req, product), 'access_token')) {
      isAuthorized = true;
    }
    appDetails.isAuthorized = isAuthorized;
  }

  appDetails.v2 = constructV2Response(req);

  debuglog(`Responding to product with ${JSON.stringify(appDetails)}`);

  res.send(appDetails);
}

iframeRouter.use('/iframe/oauth', express.static(`${__dirname}/../web/pages/oauth`));

/*
IFrame:
All the contents inside the app directory being served as static files.
*/
iframeRouter.use('/iframe', (req, res, next) => {
  const fullPath = `./app${req.path}`;

  if (req.method === 'GET') {
    if (req.path.endsWith('.js')) {
      debuglog(`Responding with contents of ${req.path}`);
      return res.send(coverageUtil.instrument(fullPath));
    }

    if (req.path.endsWith('.html')) {
      debuglog(`Responding with contents of ${req.path}`);
      return res.send(fs.readFileSync(fullPath, 'utf8') + WSS_SCRIPT);
    }
  }

  return staticMiddleware(req, res, next);
});

iframeRouter.post('/iframe/coverage', (req, res) => {
  const coverageStats = req.body;

  coverageUtil.update(coverageStats);

  res.send('OK');
});

function testingPage(req, res) {
  if (manifest.features.includes('backend')) {
      res.send(fileUtil.readFile(__dirname + '/../web/views/event-page.html'));
  }
  else {
      res.send(fileUtil.readFile(__dirname + '/../web/views/event-page-404.html'));
  }
}

iframeRouter.get('/iframe/api', iframeAPIHandler);
iframeRouter.get('/iframe/api/v2', iframeAPIHandlerV2);

iframeRouter.get('/web/test', testingPage);
iframeRouter.use('/web/assets', express.static(`${__dirname}/../web/assets`));

module.exports = iframeRouter;
