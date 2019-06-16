'use strict';

const _ = require('lodash');
const manifest = require('../manifest');
const debuglog = __debug.bind(null, __filename);

function actionsList() {
  var actions= [];

  try {
    if (!_.isEmpty(manifest.actions) && _.includes(manifest.features, 'backend')) {
      for (var item in manifest.actions) {
        actions.push(manifest.actions[item].name);
      }
    }
    return actions;
  }
  catch (err) {
    debuglog(`Error while getting list of actions ${err}`);
  }
}

function isValidAction(actionName) {
  return _.includes(actionsList(), actionName);
}

module.exports = {
  actionsList,
  isValidAction
};
