'use strict';

const { isEmpty } = require('lodash');
const manifest = require('../manifest');
const debuglog = __debug.bind(null, __filename);
const fileUtil = require('../utils/file-util');
const path = require('path');

const jsf = require('json-schema-faker');
const testDataPath = path.join(process.cwd(), 'server/test_data');

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

function getActionFilePath(name) {
  return path.join(testDataPath, `${name}.json`);
}

function generateFake(action, overwrite = false) {
  const request = action.parameters;
  const name = action.name;
  const fileName = getActionFilePath(name);

  if (!isEmpty(request)) {
    if (fileUtil.fileExists(fileName) && !overwrite) {
      return;
    }
    const fakeData = jsf.generate(request);

    fileUtil.writeFile(fileName, JSON.stringify(fakeData));
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
  var fileName = getActionFilePath(action);

  try {
    var newaction = manifest.actions.filter(function (item) {
      if (item.name === action) {
        return item;
      }
      return;
    });

    err = generateFake(newaction[0], true);
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
