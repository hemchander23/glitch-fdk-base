'use strict';

const _ = require('lodash');
const fs = require('fs');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const passport = require('passport');
const refresh = require('passport-oauth2-refresh');
const uuid = require('uuid');

const configUtil = require('../utils/config-util');
const helper = require('../utils/helper');

const httpUtil = require('../utils/http-util');
const cryptoUtil = require('../utils/crypto-util');
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

function fetchOauthIparams() {
  return oauthUtil.fetchIparams();
}

function fetchCredentials(req) {
  if (isNotAgent()) {
    return oauthUtil.fetchCredentialsForAccount();
  }

  return oauthUtil.fetchCredentialsForAgent(req);
}

function tokenHandler(accessToken, refreshToken, oauthIparams, res) {
  const credentials = {
    access_token : isNotAgent() ? accessToken : cryptoUtil.encryptToken(accessToken)
  };

  if (refreshToken) {
    Object.assign(credentials, {
      refresh_token: isNotAgent() ? refreshToken : cryptoUtil.encryptToken(refreshToken)
    });
  }

  if (isNotAgent()) {
    oauthUtil.storeIparams(oauthIparams);
    oauthUtil.storeCredentials(credentials);

    res.writeHead(httpUtil.status.found, {
      'Location': callback
    });

    return res.end();
  }

  return res.render('oauth_landing.html', {
    tokens: credentials
  });
}

function getOAuthIparams(req) {
  /**
    If the authorization takes place for the first time, oauth_iparams are
    sent via query params from the form.

    Else use the stored oauth_iparams.
  */

  if (isNotAgent()) {
    const oauthIparamsCredentials = fetchOauthIparams();

    if (req.query.oauth_iparams) {
      oauthIParams = JSON.parse(req.query.oauth_iparams);
    }
    else if (oauthIparamsCredentials && oauthIparamsCredentials.oauth_iparams) {
      oauthIParams = oauthIparamsCredentials;
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

  const oauthStrategy = new OAuth2Strategy({
    clientID: oAuthConfigs.client_id,
    clientSecret: oAuthConfigs.client_secret,
    callbackURL: OAUTH_CALLBACK,
    authorizationURL: oAuthConfigs.authorize_url,
    tokenURL: oAuthConfigs.token_url,
    customHeaders
  }, function (accessToken, refreshToken) {
    tokenHandler(accessToken, refreshToken, oauthIParams, res);
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
  const data = fetchCredentials(req);

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
          oauthUtil.storeCredentials(credentials);
          if (accessToken || refreshToken) {
            return res.status(httpUtil.status.ok).json({
              success: true
            });
          }
        } else {
          const responsePayLoad = {
            action : 'refresh',
            tokens : {
              access_token : cryptoUtil.encryptToken(accessToken),
              refresh_token : cryptoUtil.encryptToken(refreshToken)
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
    if (!state) {
      throw new Error(BLANK_STATE);
    }

    if (state !== oauthUtil.fetchState()) {
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
  const oauthIparams = req.query.oauth_iparams ? JSON.parse(req.query.oauth_iparams) : {};
  const stateUuid = uuid.v4();

  oauthUtil.storeIparams(oauthIparams);
  oauthUtil.storeState(stateUuid);

  passport.authenticate(STRATEGY, {
    state: stateUuid
  })(req, res);
});

oauthRouter.get('/auth/callback', passport.authenticate(STRATEGY, {
  session: false
}));

oauthRouter.get('/accesstoken', (req, res) => {
  const credentials = fetchCredentials(req);

  if (credentials) {
    return res.send(credentials.access_token);
  }

  return res.status(httpUtil.status.not_found).send();
});

oauthRouter.get('/oauth_iparams', (req, res) => {
  const oauthConfig = configUtil.getOAuthIparam();

  if (oauthConfig.oauth_iparams && !_.isEmpty(oauthConfig.oauth_iparams)) {
    return res.json(oauthConfig.oauth_iparams);
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
