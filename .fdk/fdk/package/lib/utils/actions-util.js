'use strict';

const { isEmpty } = require('lodash');
const manifest = require('../manifest');
const debuglog = __debug.bind(null, __filename);
const fileUtil = require('../utils/file-util');

const jsf = require('json-schema-faker');
const path = `${process.cwd()}/server/test_data`;

jsf.extend('faker', function(){
  var faker = require('faker');

  faker.locale = 'en';
  faker.custom = {
    tags: function() {
      return faker.lorem.word() + ',' + faker.lorem.word() + ',' + faker.lorem.word();
    }
  };
  return faker;
});

function generateFake(action) {
  var request = action.parameters;
  var name = action.name;

  if (!isEmpty(request)) {
    var fileName = `${path}/${name}.json`;
    var data = jsf(request);

    fileUtil.writeFile(fileName, JSON.stringify(data));
  }
  return;
}

function isBackendApp() {
  return manifest.features.includes('backend');
}

function actionsList() {
  var actions = [];

  try {
    if (!isEmpty(manifest.actions) && manifest.features.includes('backend')) {
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
  return actionsList().includes(actionName);
}

function createFakeJSON() {
  let errMsgs = '';

  try {
    if (!isEmpty(manifest.actions) && isBackendApp()) {
      for (var item in manifest.actions) {
        var action = manifest.actions[item];

        errMsgs = generateFake(action);
      }
    }
  }
  catch (err) {
    return 'Error while generating fake payload';
  }

  return errMsgs;
}

function restoreActionData(action) {
  let err = '';
  var fileName = `${path}/${action}.json`;

  try {
    var newaction = manifest.actions.filter(function (item) {
      if (item.name === action) {
        return item;
      }
      return;
    });

    err = generateFake(newaction[0]);
    if (!err) {
      return JSON.parse(fileUtil.readFile(fileName));
    }

    return;
  }
  catch (err) {
    console.log(`Error while restoring action file: ${err}`);
  }
}

module.exports = {
  actionsList,
  isValidAction,
  createFakeJSON,
  restoreActionData
};
