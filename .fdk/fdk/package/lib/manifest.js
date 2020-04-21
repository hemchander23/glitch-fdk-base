'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs');
const process = require('process');
const fileUtil = require('./utils/file-util');

const manifestFile = './manifest.json';
const serverFile = './server/server.js';
const oauthFile = './config/oauth_config.json';
const actionsFile = './actions.json';

const charset = 'utf8';

function inferFeatures() {
  // Always support `db`...
  const inferredFeatures = [ 'db' ];

  if (fs.existsSync(serverFile)) {
    inferredFeatures.push('backend');
  }

  if (fs.existsSync(oauthFile)) {
    let isAgentLevel;

    /*eslint-disable */
    try {
      isAgentLevel = JSON.parse(fs.readFileSync(oauthFile, charset))['token_type']==='agent';
    } catch (err) {
      console.error('OauthFile ERROR ' + err);
      process.exit(1);
    }
    /*eslint-enable */


    if (isAgentLevel){
      inferredFeatures.push('agent_oauth');
    }
    else {
      inferredFeatures.push('oauth');
    }

  }

  debuglog(`Inferred ${inferredFeatures} as features.`);

  return inferredFeatures;
}

function processActions(actions) {
  var actionsList = [];

  for (var actionName in actions) {
    if (actions.hasOwnProperty(actionName)) {
      actionsList.push(Object.assign({ 'name' : actionName }, actions[actionName]));
    }
  }
  return actionsList;
}

function getActions() {
  let loadActions;

  if (fs.existsSync(actionsFile)) {
    try {
      loadActions = JSON.parse(fileUtil.readFile(actionsFile, 'utf8'));
      return processActions(loadActions);
    }
    catch (err) {
      console.log('Error while parsing actions file', err);
      debuglog(`Error while parsing actions file ${err.message}`);

      return process.exit(1);
    }
  }

  return [];
}
/*
  reload function to update the manifest details to the module.
  usage: require("manifest").reload() will update the details.
*/

function reload() {
  let doc;

  if (!fs.existsSync(manifestFile)) {
    console.log('Could not find the app manifest file in the current/specified directory.');
    return process.exit(1);
  }
  try {
    doc = JSON.parse(fs.readFileSync(manifestFile, charset));
  }
  catch (e) {
    debuglog(`Error while parsing manifest file ${e.message}`);
    console.log('Could not parse the app manifest file in the current/specified directory.');

    return process.exit(1);
  }

  debuglog(`Reloading manifest with ${JSON.stringify(doc)}.`);

  module.exports.manifest = doc;
  // Easy access to common use properties:
  module.exports.pfVersion = doc['platform-version'];
  module.exports.features = inferFeatures();
  module.exports.product = doc.product;
  module.exports.dependencies = doc.dependencies || {};
  module.exports.devDependencies = doc.devDependencies || {};
  module.exports.actions = getActions();
}

module.exports = {
  reload: reload,
  manifest: null,
  pfVersion: null,
  product: null,
  features: null,
  dependencies: null,
  actions: null
};

// Load the manifest the first time:
reload();
