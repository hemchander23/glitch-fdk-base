'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs');
const process = require('process');
const fileUtil = require('./utils/file-util');

const manifestFile = './manifest.json';
const serverFile = './server/server.js';
const oauthFile = './config/oauth_config.json';
const actionsFile = './actions.json';
const entitiesFile = './config/entities.json';

const charset = 'utf8';

function inferFeatures(manifest) {
  // Always support `db`...
  const inferredFeatures = ['db'];

  if (fs.existsSync(serverFile)) {
    inferredFeatures.push('backend');
  }

  if (Object.keys(module.exports.product || {}).length > 1) {
    inferredFeatures.push('omni');
  }

  const manifestSettings = manifest.settings;

  if (manifestSettings && manifestSettings.iparams &&
    manifestSettings.iparams.hideStandardButtons) {
    inferredFeatures.push('iparams_hidden_buttons');
  }

  if (fs.existsSync(oauthFile)) {
    let isAgentLevel;

    /*eslint-disable */
    try {
      isAgentLevel = JSON.parse(fs.readFileSync(oauthFile, charset))['token_type'] === 'agent';
    } catch (err) {
      console.error('OauthFile ERROR ' + err);
      process.exit(1);
    }
    /*eslint-enable */


    if (isAgentLevel) {
      inferredFeatures.push('agent_oauth');
    } else {
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
      actionsList.push(Object.assign({
        'name': actionName
      }, actions[actionName]));
    }
  }
  return actionsList;
}

function getActions(raw = false) {
  let loadActions;

  if (fs.existsSync(actionsFile)) {
    try {
      loadActions = JSON.parse(fileUtil.readFile(actionsFile, 'utf8'));
      if (!raw) {
        return processActions(loadActions);
      }
      return loadActions;
    } catch (err) {
      console.log('Error while parsing actions file', err);
      debuglog(`Error while parsing actions file ${err.message}`);

      return process.exit(1);
    }
  }

  return [];
}

function getEntities() {
  let entities = {};

  if (fs.existsSync(entitiesFile)) {
    try {
      entities = JSON.parse(fileUtil.readFile(entitiesFile, 'utf8'));
    }
    catch (err) {
      debuglog(`Error while parsing entities file ${err.message}`);
      console.log('Error while parsing entities file', err);

      return process.exit(1);
    }
  }

  return entities;
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
  } catch (e) {
    debuglog(`Error while parsing manifest file ${e.message}`);
    console.log('Could not parse the app manifest file in the current/specified directory.');

    return process.exit(1);
  }

  debuglog(`Reloading manifest with ${JSON.stringify(doc)}.`);

  module.exports.manifest = doc;
  // Easy access to common use properties:
  module.exports.pfVersion = doc['platform-version'];
  module.exports.product = doc.product;
  module.exports.dependencies = doc.dependencies || {};
  module.exports.devDependencies = doc.devDependencies || {};
  module.exports.features = inferFeatures(doc);
  module.exports.actions = getActions();
  module.exports.entities = getEntities();
}

module.exports = {
  reload: reload,
  manifest: null,
  pfVersion: null,
  product: null,
  features: null,
  dependencies: null,
  actions: null,
  entities: getEntities(),
  getActions
};

// Load the manifest the first time:
reload();
