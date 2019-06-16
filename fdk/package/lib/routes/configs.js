'use strict';

const _ = require('lodash');

const DataStore = require('../utils/data-store');
const fileUtil = require('../utils/file-util');
const httpUtil = require('../utils/http-util');
const configUtil = require('../utils/config-util');
const manifest = require('../manifest');
const oauth = require('./oauth2');
const nsUtil = require('../utils/ns-resolver');

const storage = new DataStore({});

const Router = require('express').Router;
const configsRouter = new Router();

/*
  Save custom Iparams data to storage (file) with namespace
*/
function saveIParamsToDB(data) {
  storage.store(nsUtil.getInternalNamespace('custom_iparams'), data);
}

/*
  Fetch custom IParams data from storage (file) with namespace
*/
function getIParamsFromDB() {
  return storage.fetch(nsUtil.getInternalNamespace('custom_iparams'));
}

/*
  Route handler - fetch
  Get custom IParams from storage
  If exists return data else return {}
*/
function fetchCustomIParams(req, res) {
  let customIParams = getIParamsFromDB();

  if (customIParams === null || customIParams === undefined) {
    customIParams = {};
  }

  return res.send({
    isCustomIParam: fileUtil.fileExists(`${process.cwd()}/config/iparams.html`),
    customIParams
  });
}

/*
  Route handler - To store custom IParams
  Store posted custom IParams to DB
*/
function storeCustomIParams(req, res) {
  saveIParamsToDB(req.body);
  res.send();
}

/*
  Route handler - To fetch custom installation Page
  If app is oauth & not authorized
    -> Authorize and redirect to form page
*/
function customIParamsPage(req, res) {
  if (manifest.features.includes('oauth') && !_.has(oauth.fetchCredentials(), 'access_token')) {
    res.writeHead(httpUtil.status.found, {
      'Location': 'http://localhost:10001/auth/index?callback=http://localhost:10001/custom_configs'
    });
    return res.end();
  }

  return res.render('custom-iparams.html');
}

/*
  Route handler - To fetch custom installation page form content
*/
function customIParamsForm(req, res) {
  if (fileUtil.fileExists(`${process.cwd()}/config/iparams.html`)) {
    return res.send(fileUtil.readFile(`${process.cwd()}/config/iparams.html`));
  }

  if (fileUtil.fileExists(`${process.cwd()}/config/iparams.json`)) {
    // !! DONOT REPLACE THIS LINE WITH REQUIRE AS IT CACHES IPARAMS AND WE DONT WANT THAT !!
    const iparamJSON = JSON.parse(fileUtil.readFile(`${process.cwd()}/config/iparams.json`));

    return res.send(configUtil.generateIparamHTML(iparamJSON));
  }

  return res.send();
}

configsRouter.get('/custom_configs', customIParamsPage);
configsRouter.get('/custom_configs/form', customIParamsForm);
configsRouter.get('/custom_configs/fetch', fetchCustomIParams);
configsRouter.post('/custom_configs/store', storeCustomIParams);

module.exports = configsRouter;
