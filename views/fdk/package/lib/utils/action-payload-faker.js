'use strict';

const manifest = require('../manifest');
const fileUtil = require('../utils/file-util');
const _ = require('lodash');

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

  if (!_.isEmpty(request)) {
    var fileName = `${path}/${name}.json`;
    var data = jsf(request);

    fileUtil.writeFile(fileName, JSON.stringify(data));
  }
  return;
}

function isBackendApp() {
  return _.includes(manifest.features, 'backend');
}

module.exports = {
  createFakeJSON: function(){
    let errMsgs = '';

    try {
      if (!_.isEmpty(manifest.actions) && isBackendApp()) {
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
  },

  restoreActionData: function(action) {
    let err = '';
    var fileName = `${path}/${action}.json`;

    try {
      var newaction =_.filter(manifest.actions, function(item) {
        if (item.name === action) {
          return item;
        }
      });

      err = generateFake(newaction[0]);
      if (!err) {
        return JSON.parse(fileUtil.readFile(fileName));
      }

      return ;
    }
    catch (err) {
      console.log(`Error while restoring action file: ${err}`);
    }
  }
};
