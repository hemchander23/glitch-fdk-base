'use strict';

const validationConst = require('./constants').validationContants;
const _ = require('lodash');
const manifest = require('../manifest');
const fileUtil = require('../utils/file-util');

const path = `${process.cwd()}/server/test_data`;
const errorLog = require('../utils/error-util');

//ajv init
const Ajv = require('ajv');
const ajvOptions = {
  inlineRefs: false,
  allErrors: true,
  meta: false
};
const ajv = new Ajv(ajvOptions);
//var metaSchema = require(`${os.homedir()}/node_modules/ajv/lib/refs/json-schema-draft-04.json`);
var metaSchema = require('../../node_modules/ajv/lib/refs/json-schema-draft-04.json');

ajv.addMetaSchema(metaSchema);

function printError(errors, name){
  const title = `${name} has following schema errors`;

  const formattedErrors = errors.map((error)=>{
    return `data${error.dataPath} ${error.message}`;
  });

  errorLog.printError(title, formattedErrors, false);
}

function validateschema(schema, name) {
  var err = [];

  ajv.errors = null;
  var result = ajv.compile(schema);

  err.push(ajv.errorsText(result.errors));
  _.remove(err, function(item) { return (item === 'No errors');});

  if (_.isEmpty(err)) {
    var file = `${path}/${name}.json`;

    if (fileUtil.fileExists(file)) {
      var payload = JSON.parse(fileUtil.readFile(file));
      var valid = ajv.validate(schema, payload);

      if (!valid){
        printError(ajv.errors, name);
        err.push(ajv.errorsText());
      }
      return err;
    }
    err.push(`Sample payload for ${name} does not exist`);
  }
  return err;
}

function validateSchemas() {
  var err = [];

  for (var item in manifest.actions) {
    var action = manifest.actions[item];

    try {
      var request = action.parameters;

      if (!_.isEmpty(request)) {
        err.push(validateschema(request, action.name));
      }
    }
    catch (error) {
      err.push(`${error}`);
    }
  }
  return _.flattenDeep(err);
}

function validateData(schema, data) {
  var err = '';
  const removeError = ' data should match some schema in anyOf';

  ajv.errors = null;
  var valid = ajv.validate(schema, data);

  if (!valid){
    printError(ajv.errors, 'Triggered action');
    err = ajv.errorsText();
  }

  err = _.join(_.filter(err.split(','), (item) => (item !== removeError)), ',');
  return err;
}

function isBackendApp() {
  return _.includes(manifest.features, 'backend');
}

function fetchResponseSchema(actionName) {
  return manifest.getActions(true)[actionName].response;
}

module.exports = {
  validate() {
    let errMsgs = '';

    try {
      if (!_.isEmpty(manifest.actions) && isBackendApp()) {
        errMsgs = validateSchemas();
      }
      return _.flattenDeep(errMsgs);
    }
    catch (e) {
      return [`Exception occured while validation: ${e.message}`];
    }
  },

  validateSingleAction(actionName, data, type) {
    let errMsgs = '';
    var schema = {};

    try {
      if (type !== 'request') {
        schema = fetchResponseSchema(actionName);
      }

      if (type === 'request') {
        for (var item in manifest.actions) {
          var action = manifest.actions[item];

          if (action.name === actionName) {
            schema = action.parameters;
          }
        }
      }

      errMsgs = validateData(schema, data);

      return errMsgs;
    }
    catch (e) {
      return [`Exception occured while validating schema: ${e.message}`];
    }
  },

  validationType: [validationConst.RUN_VALIDATION]
};
