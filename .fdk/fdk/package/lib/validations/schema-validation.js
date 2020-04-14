'use strict';

const validationConst = require('./constants').validationContants;
const _ = require('lodash');
const manifest = require('../manifest');
const os = require('os');
const fileUtil = require('../utils/file-util');
const DataStore = require('../utils/data-util').DataStore;

const path = `${process.cwd()}/server/test_data`;
const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});
const addonVersion = dbApi.fetch('version_details').addon.version;

const responseSchemaPath = `${os.homedir()}/.fdk/addon/addon-${addonVersion}/actions/response_schema.json`;
//ajv init
const Ajv = require('ajv');
var ajvOptions = {inlineRefs: false, allErrors: true, meta: false};
const ajv = new Ajv(ajvOptions);
//var metaSchema = require(`${os.homedir()}/node_modules/ajv/lib/refs/json-schema-draft-04.json`);
var metaSchema = require('../../node_modules/ajv/lib/refs/json-schema-draft-04.json');

ajv.addMetaSchema(metaSchema);

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
        console.log(ajv.errors);
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
    console.log(ajv.errors);
    err = ajv.errorsText();
  }

  err = _.join(_.filter(err.split(','), (item) => (item !== removeError)), ',');
  return err;
}

function isBackendApp() {
  return _.includes(manifest.features, 'backend');
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
        schema = JSON.parse(fileUtil.readFile(responseSchemaPath));
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
