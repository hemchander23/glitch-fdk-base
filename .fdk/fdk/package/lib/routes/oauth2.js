'use strict';

const _ = require('lodash');
const fs = require('fs');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const passport = require('passport');
const refresh = require('passport-oauth2-refresh');
const uuid = require('uuid');
const manifest = require('../manifest');

const configUtil = require('../utils/config-util');
const helper = require('../utils/helper-util');

const httpUtil = require('../utils/http-util');
const cryptoUtil = helper.crypto;
const oauthUtil = require('../utils/oauth-util');

const charset = 'utf8';
const STRATEGY = 'oauth2';
const BLANK_STATE = 'State is blank';
const INVALID_STATE = 'Invalid state';
const OAUTH_CALLBACK = 'http://localhost:10001/auth/callback';
const REFRESH_FAILURE_STATUS = 210;

let cachedOAuthConfig = null;
let token_type = null;

const express = require('express');
const Router = express.Router;

const oauthRouter = new Router();

const products = Object.keys(manifest.product);

function readOAuthConfig() {
  if (cachedOAuthConfig) {
    return cachedOAuthConfig;
  }
  cachedOAuthConfig = fs.readFileSync('./config/oauth_config.json', charset);

  return cachedOAuthConfig;
}

function isNotAgent() {
  if (token_type) {
    return token_type !== 'agent';
  }

  token_type = JSON.parse(readOAuthConfig()).token_type;

  return token_type !== 'agent';
}

/**
  oauthIparams to be global to preserve the oauthIparams over re-direction
*/
let oauthIParams = {};
let callback = '';
let product = '';

function fetchOauthIparams(product) {
  return oauthUtil.fetchIparams(product);
}

function fetchCredentials(req, product) {
  if (isNotAgent()) {
    return oauthUtil.fetchCredentialsForAccount(product);
  }

  return oauthUtil.fetchCredentialsForAgent(req);
}

function tokenHandler(accessToken, refreshToken, oauthIparams, res, product) {
  const credentials = {
    access_token : isNotAgent() ? accessToken : cryptoUtil.encryptToken(accessToken)
  };

  if (refreshToken) {
    Object.assign(credentials, {
      refresh_token: isNotAgent() ? refreshToken : cryptoUtil.encryptToken(refreshToken)
    });
  }

  if (isNotAgent()) {
    oauthUtil.storeIparams(oauthIparams, product);
    oauthUtil.storeCredentials(credentials, product);

    res.writeHead(httpUtil.status.found, {
      'Location': callback
    });

    return res.end();
  }

  return res.render('oauth_landing.html', {
    tokens: credentials
  });
}

function getProductName(req) {
  try {
    return new URL(req.query.callback).searchParams.get('product') || req.query.product || products[0];
  }
  catch (ex) {
    return products[0];
  }
}

function getOAuthIparams(req) {
  /**
    If the authorization takes place for the first time, oauth_iparams are
    sent via query params from the form.

    Else use the stored oauth_iparams.
  */

  if (isNotAgent()) {
    const product = getProductName(req);
    const oauthIparamsCredentials = fetchOauthIparams(product);

    if (req.query.oauth_iparams) {
      oauthIParams = JSON.parse(req.query.oauth_iparams);
    }
    else if (oauthIparamsCredentials && oauthIparamsCredentials.oauth_iparams) {
      oauthIParams = oauthIparamsCredentials;
    } else if (oauthIparamsCredentials) {
      oauthIParams = oauthIparamsCredentials;
    } else {
      oauthIParams = {};
    }
  }

  return oauthIParams;
}

function getOAuthConfigs(req) {
  const oauthConfig = readOAuthConfig();
  const templatedOAuthConfig = _.template(oauthConfig)(Object.assign({
    oauth_iparams: getOAuthIparams(req)
  }, helper.templateMethods));

  return JSON.parse(templatedOAuthConfig);
}

function fetchCustomOptions(oAuthConfig) {
  let customHeaders = {}, authorizationParams = {};

  if (!(_.isEmpty(oAuthConfig.options))) {
    const clientOptions = oAuthConfig.options;

    customHeaders = clientOptions.customHeaders;
    authorizationParams = _.omit(clientOptions, 'customHeaders');
  }

  return [
    customHeaders,
    authorizationParams
  ];
}

function oauthInit(req, res, next) {
  const oAuthConfigs = getOAuthConfigs(req);

  const [customHeaders, authorizationParams] = fetchCustomOptions(oAuthConfigs);
  const product = getProductName(req);
  const queryString = req.query.callback ? `?callback=${req.query.callback}&product=${product}` : '';

  const oauthStrategy = new OAuth2Strategy({
    clientID: oAuthConfigs.client_id,
    clientSecret: oAuthConfigs.client_secret,
    callbackURL: `${OAUTH_CALLBACK}${queryString}`,
    authorizationURL: oAuthConfigs.authorize_url,
    tokenURL: oAuthConfigs.token_url,
    customHeaders
  }, function (accessToken, refreshToken) {
    tokenHandler(accessToken, refreshToken, oauthIParams, res, product);
  });

  oauthStrategy.authorizationParams = () => {
    return authorizationParams;
  };

  passport.use(oauthStrategy);
  refresh.use(oauthStrategy);

  if (next) {
    next();
  }
}

function refreshInit(req, res) {
  const currentProductName = product || products[0];
  const data = fetchCredentials(req, currentProductName);

  if (data.refresh_token) {
    return refresh.requestNewAccessToken(STRATEGY, data['refresh_token'],
      (err, accessToken, refreshToken) => {
        const credentials = {
          access_token: accessToken || data['access_token'],
          refresh_token: refreshToken || data['refresh_token']
        };

        if (err) {
          return res.status(err.statusCode).send({
            status: err.statusCode,
            headers: {},
            response: err.data
          });
        }

        if (isNotAgent()) {
          oauthUtil.storeCredentials(credentials, currentProductName);
          if (accessToken || refreshToken) {
            return res.status(httpUtil.status.ok).json({
              success: true
            });
          }
        } else {
          const responsePayLoad = {
            action : 'refresh',
            tokens : {
              access_token : cryptoUtil.encryptToken(credentials.access_token),
              refresh_token : cryptoUtil.encryptToken(credentials.refresh_token)
            }
          };

          return res.status(httpUtil.status.ok).send(responsePayLoad);
        }

      });
  }

  const responsePayLoad = {
    status: 210,
    headers: {},
    response: 'Access token cannot be refreshed'
  };

  return res.status(REFRESH_FAILURE_STATUS).send(responsePayLoad);
}

function verifyState(req, res, next) {
  const state = req.query.state;

  try {
    const product = getProductName(req);

    if (!state) {
      throw new Error(BLANK_STATE);
    }

    if (state !== oauthUtil.fetchState(product)) {
      throw new Error(INVALID_STATE);
    }
  }
  catch (e) {
    return res.end(INVALID_STATE);
  }

  return next();
}

oauthRouter.use('/auth/index', (req, res, next) => {
  if (req.query.callback) {
    callback = req.query.callback;
    product = getProductName(req);
  }

  if (isNotAgent()) {
    const oauthIParams = configUtil.getOAuthIparam().oauth_iparams;

    if (oauthIParams && !_.isEmpty(oauthIParams) && !req.query.oauth_bypass) {
      return res.render('oauth-forms.html');
    }
  }
  oauthInit(req, res, next);
});

oauthRouter.use('/auth/callback', verifyState);

oauthRouter.use('/auth/callback', (req, res, next) => {
  oauthInit(req, res, next);
});

oauthRouter.get('/auth/index', (req, res) => {
  const oauthIparams = getOAuthIparams(req) || {};
  const stateUuid = uuid.v4();
  const product = getProductName(req);

  oauthUtil.storeIparams(oauthIparams, product);
  oauthUtil.storeState(stateUuid, product);

  passport.authenticate(STRATEGY, {
    state: stateUuid
  })(req, res);
});

oauthRouter.get('/auth/callback', passport.authenticate(STRATEGY, {
  session: false
}));

oauthRouter.get('/accesstoken', (req, res) => {
  const product = req.query.product || products[0];
  const credentials = fetchCredentials(req, product);

  if (credentials) {
    return res.send(credentials.access_token);
  }

  return res.status(httpUtil.status.not_found).send();
});

oauthRouter.get('/oauth_iparams', (req, res) => {
  const oauthConfig = configUtil.getOAuthIparam();

  if (oauthConfig.oauth_iparams && !_.isEmpty(oauthConfig.oauth_iparams)) {
    const iparams = oauthConfig.oauth_iparams;

    const values = getOAuthIparams(req) || {};

    for (const key of Object.keys(iparams)) {
      iparams[key].value = values[key];
    }

    return res.json(iparams);
  }

  return res.json({});
});

module.exports = {

  fetchCredentials,

  fetchOauthIparams,

  isNotAgent,

  refresh: (req, res) => {
    oauthInit(req, res);
    refreshInit(req, res);
  },

  oauthRouter
};
