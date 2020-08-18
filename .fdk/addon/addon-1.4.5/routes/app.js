'use strict';

const debuglog = __debug.bind(null, __filename);

const DataStore = require(`${global.FDK_PATH}/lib/utils/data-store.js`);
const stateStore = new DataStore();
const manifest = require(`${global.FDK_PATH}/lib/manifest.js`);
const path = require('path');
const configUtil = require(`${global.FDK_PATH}/lib/utils/config-util.js`);

const Router = require(`express`).Router;
const appsRouter = new Router();

let oauthStatus = 'notstarted';

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
    thumb: 'http://localhost:10001/web/assets/freshworks_logo.svg',
    thumb2x: 'http://localhost:10001/web/assets/freshworks_logo.svg'
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
  configs_url: 'http://localhost:10001/custom_configs/form',
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

const getInstalledExtensionDetail = () => ({
  installed_extension_id: -1,
  installed_versions: [ -1 ],
  extension_id: -1,
  version_id: -1,
  installed: !!stateStore.fetch('isLocalAppInstalled'),
  enabled: !!stateStore.fetch('isLocalAppEnabled'),
  configs: configUtil.getValuesForLocalTesting() || {},
  state: 2,
  extension_type: 6
});

appsRouter.get('/apps/customApps', (req, res) => {
  const isLocalAppInstalled = !!stateStore.fetch('isLocalAppInstalled');

  return res.json([{
    extensionDetail: getExtensionDetail(),
    installedExtnDetail: isLocalAppInstalled ? getInstalledExtensionDetail() : {}
  }]);
});

appsRouter.get('/apps/:id', (req, res) => {
  const response = {
    extDetail: getExtensionDetail(),
    installedExtn: getInstalledExtensionDetail()
  };

  debuglog(`/app/${req.params.id} responding with ${JSON.stringify(response)}`);

  return res.json(response);
});

appsRouter.post('/apps/:id/install', (req, res) => {
  debuglog('Installing local app.');

  configUtil.setConfig(req.body.configs);
  stateStore.store('isLocalAppInstalled', true);
  stateStore.store('isLocalAppEnabled', true);

  return res.send({
    statusCode: 200
  });
});

appsRouter.delete('/apps/:id/uninstall', (req, res) => {
  debuglog('Uninstalling local app.');
  configUtil.purgeConfig();
  stateStore.delete('isLocalAppInstalled');
  stateStore.delete('isLocalAppEnabled');
  // this wont work due to name spacing issues
  stateStore.delete('oauth');

  return res.send({
    statusCode: 200
  });
});

appsRouter.get('/apps/:id/configs', (req, res) => {
  debuglog('Fetching local app configs.');

  return res.send({
    statusCode: 200,
    configs: configUtil.getValuesForLocalTesting()
  });
});

appsRouter.put('/apps/:id/update', (req, res) => {
  debuglog(`Received local app update call. ${JSON.stringify(req.body)}`);

  const state = req.body.state;

  if (state === 'edit') {
    configUtil.setConfig(req.body.configs);
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

  return res.redirect('/auth/index?callback=/oauth_landing.html');
});

appsRouter.post('/apps/:id/reauthorize', (req, res) => res.send({ status: 200 }));

module.exports = appsRouter;
