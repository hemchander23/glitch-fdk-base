'use strict';

const debuglog = __debug.bind(null, __filename);

const DataStore = require(`${global.FDK_PATH}/lib/utils/data-util`).DataStore;
const manifest = require(`${global.FDK_PATH}/lib/manifest.js`);
const path = require('path');
const configUtil = require(`${global.FDK_PATH}/lib/utils/config-util.js`);
const appUtil = require(`${global.FDK_PATH}/lib/utils/app-util`);
const fileUtil = require(`${global.FDK_PATH}/lib/utils/file-util`);
const nsUtil = fileUtil.nsresolver;

const Router = require(`${global.FDK_PATH}/node_modules/express`).Router;
const appsRouter = new Router();
const LOCAL_URL = 'http://localhost:10001';
let oauthStatus = 'notstarted';

const getProductKey = (product) => nsUtil.getInternalNamespace('product_name', { product });

const getExtensionDetail = () => ({
  extension_id: -1,
  id: -1,
  account: manifest.manifest.author,
  name: process.cwd().split(path.sep).pop(),
  display_name: process.cwd().split(path.sep).pop(),
  description: manifest.manifest.description,
  overview: manifest.manifest.overview,
  instructions: manifest.manifest.instructions,
  features: manifest.features,
  cover_art: {
    thumb: `${LOCAL_URL}/web/assets/freshworks_logo.svg`,
    thumb2x: `${LOCAL_URL}/web/assets/freshworks_logo.svg`
  },
  screenshots: [{
    large: 'https://dej20ntrln9u1.cloudfront.net/images/test_data/791/live_screenshot/large/Screen_Shot_2018_01_24_at_11.03.20_PM.png',
    large2x: 'https://dej20ntrln9u1.cloudfront.net/images/test_data/791/live_screenshot/large2x/Screen_Shot_2018_01_24_at_11.03.20_PM.png'
  }],
  categories: [],
  type: 6,
  install_count: 0,
  published_at: Date().toString(),
  contact_details: {
    support_email: 'dummy@heeloc.com',
    support_url: 'http://com.com'
  },
  options: {},
  is_local: true,
  has_config: configUtil.hasConfig(),
  configs_url: `${LOCAL_URL}/custom_configs/form`,
  published_date: 'a few moments',
  platform_details: {
    '2.0': true
  },
  version_id: -1,
  events: {},
  placeholders: {
    ticket_sidebar: {
      url: 'https://dej20ntrln9u1.cloudfront.net/app-assets/test_data/e23f49923ae1f1191bcd/app/template.html',
      icon_url: 'https://dej20ntrln9u1.cloudfront.net/app-assets/test_data/e23f49923ae1f1191bcd/app/icon.svg'
    }
  },
  app_type: 1
});

const getInstalledExtensionDetail = (product) => {
  const productKey = getProductKey(product);
  const stateStore = new DataStore({ scope: productKey });

  return {
    installed_extension_id: -1,
    installed_versions: [-1],
    extension_id: -1,
    version_id: -1,
    installed: !!stateStore.fetch('isLocalAppInstalled'),
    enabled: !!stateStore.fetch('isLocalAppEnabled'),
    configs: configUtil.getValuesForLocalTesting(product) || {},
    state: 2,
    extension_type: 6
  };
};

appsRouter.get('/apps/customApps', (req, res) => {
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];
  const productKey = getProductKey(product);
  const stateStore = new DataStore({ scope: productKey });

  const isLocalAppInstalled = !!stateStore.fetch('isLocalAppInstalled');
  let response = [];

  if (Object.keys(manifest.product).includes(req.query.product)) {
    response = [{
      extensionDetail: getExtensionDetail(),
      installedExtnDetail: isLocalAppInstalled ? getInstalledExtensionDetail(product) : {}
    }];
  }

  return res.json(response);
});

appsRouter.get('/apps/:id', (req, res) => {
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];
  const response = {
    extDetail: getExtensionDetail(),
    installedExtn: getInstalledExtensionDetail(product)
  };

  debuglog(`/app/${req.params.id} responding with ${JSON.stringify(response)}`);

  return res.json(response);
});

appsRouter.post('/apps/:id/install', (req, res) => {
  debuglog('Installing local app.');

  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];
  const productKey = getProductKey(product);
  const stateStore = new DataStore({ scope: productKey });

  configUtil.setConfig(req.body.configs, product);
  stateStore.store('isLocalAppInstalled', true);
  stateStore.store('isLocalAppEnabled', true);
  return appUtil.executeEvent('onAppInstall', req.body, res, {
    statusCode: 200,
    installed_extension_id: -1
  }, product);
});

appsRouter.get('/apps/:id/app_setup_event_status', (req, res) => {
  debuglog('App Event Status Check.');
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];
  const eventName = req.query.event === 'delete' ? 'onAppUninstall' : 'onAppInstall';

  return appUtil.checkAppEventStatus(eventName, res, product);
});

appsRouter.delete('/apps/:id/uninstall', (req, res) => {
  debuglog('Uninstalling local app.');
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];
  const productKey = getProductKey(product);
  const stateStore = new DataStore({ scope: productKey });

  configUtil.purgeConfig(product);
  stateStore.delete('isLocalAppInstalled');
  stateStore.delete('isLocalAppEnabled');
  // this wont work due to name spacing issues
  stateStore.delete('oauth');
  return appUtil.executeEvent('onAppUninstall', req.body, res, {
    statusCode: 200,
    installed_extension_id: -1
  }, product);
});

appsRouter.get('/apps/:id/configs', (req, res) => {
  debuglog('Fetching local app configs.');
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];

  return res.send({
    statusCode: 200,
    configs: configUtil.getValuesForLocalTesting(product)
  });
});

appsRouter.put('/apps/:id/update', (req, res) => {
  debuglog(`Received local app update call. ${JSON.stringify(req.body)}`);
  //Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];

  const state = req.body.state;
  const productKey = getProductKey(product);
  const stateStore = new DataStore({ scope: productKey });

  if (state === 'edit') {
    configUtil.setConfig(req.body.configs, product);
  }

  if (state === 'enable') {
    stateStore.store('isLocalAppEnabled', true);
  }

  if (state === 'disable') {
    stateStore.store('isLocalAppEnabled', false);
  }

  return res.send({
    statusCode: 200
  });
});

appsRouter.get('/apps/poll_status/:id/:version', (req, res) => {
  if (oauthStatus === 'success') {
    oauthStatus = 'finished';
    return res.send('OK');
  }

  return res.send('NOTOK');
});

appsRouter.get('/oauth_landing.html', (req, res) => {
  oauthStatus = 'success';

  return res.render('oauth_landing.html', {
    tokens: {}
  });
});

appsRouter.post('/data-pipe', (req, res) => {
  res.send({
    status: 204
  });
});

appsRouter.get('/apps/:id/:version/app_oauth_handshake', (req, res) => {
  oauthStatus = 'started';
//Adding product query support for omni apps (for future omni app gallery E2E support)
  const product = req.query.product || Object.keys(manifest.product)[0];

  return res.redirect(`/auth/index?callback=${LOCAL_URL}/oauth_landing.html?product=${product}`);
});

appsRouter.post('/apps/:id/reauthorize', (req, res) => res.send({ status: 200 }));

module.exports = appsRouter;
