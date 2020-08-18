'use strict';

const manifest = require('../manifest');
const validationConst = require('./constants').validationContants;
const _ = require('lodash');
var actionPayloadGenerator = require('../utils/actions-util');
var esprima = require('esprima');
var fs = require('fs');

//ajv init
const Ajv = require('ajv');
var ajvOptions = {inlineRefs: false, allErrors: true, meta: false};
const ajv = new Ajv(ajvOptions);
var metaSchema = require('../../node_modules/ajv/lib/refs/json-schema-draft-04.json');

ajv.addMetaSchema(metaSchema);

const debuglog = __debug.bind(null, __filename);
const SUPPORTED_ACTION_FIELDS = ['parameters', 'name', 'display_name', 'description', 'response'];

function compileSchema(schema) {
  var err = [];

  ajv.errors = null;

  try {
    var result = ajv.compile(schema);

    err.push(ajv.errorsText(result.errors));
    _.remove(err, function(item) { return (item === 'No errors');});

    if (!_.isEmpty(err)) {
      console.log(ajv.errors);
    }
    return err;
  }
  catch (error) {
    err.push(error.message);
    return err;
  }
}

function checkRefTags(schema) {
  if (_.includes(Object.keys(schema), '$ref')) {
    return 'Ref tags are not suuported in current version.';
  }

  return compileSchema(schema);
}

function validateSchema(schema, type) {
  if (_.isEmpty(schema)) {
    return `${type} schema cannot be empty for any action.`;
  }
  return checkRefTags(schema);
}

function validateFields(action) {
  var errMsgs = [];

  for (var item in SUPPORTED_ACTION_FIELDS) {
    var actionItem = SUPPORTED_ACTION_FIELDS[item];

    if (!_.includes(Object.keys(action), actionItem)) {
      errMsgs.push(`Key ${actionItem} is not defined for action ${action.name}`);
    }

    if (_.isEmpty(action[actionItem])) {
      errMsgs.push(`Value for ${actionItem} in ${action.name} action is empty, it is mandatory field`);
    }
  }

  return errMsgs;
}

function getActionDefinationList() {
  try {
    const code = fs.readFileSync( `${process.cwd()}/server/server.js`, 'utf8');
    const ast = esprima.parse(code).body;
    const exportsExp = _.find(ast, function(node) {
      return (node.type === 'ExpressionStatement'
          && node.expression.type === 'AssignmentExpression'
          && node.expression.left.name === 'exports');
    });

    const definedFunc = [];

    if (exportsExp) {
      const properties = exportsExp.expression.right.properties;

      _.each(properties, function(prop) {
        if (prop.value.type === 'FunctionExpression') {
          definedFunc.push(prop.key.name);
        }
      });
    }
    return definedFunc;
  }
  catch (error) {
    debuglog(error);
    return [];
  }
}

function validateActionStructure() {
  var err = [];
  var func = getActionDefinationList();

  for (var item in manifest.actions) {
    try {
      var action = manifest.actions[item];
      var fieldsRes = validateFields(action);

      if (!_.isUndefined(fieldsRes) || !_.isEmpty(fieldsRes)) {
        err.push(fieldsRes);
      }
      var res = validateSchema(action.parameters, 'request');

      if (!_.isUndefined(res) || !_.isEmpty(res)) {
        err.push(res);
      }

      if (!_.includes(func, action.name)) {
        err.push(`${action.name} does not have definition in server.js`);
      }
    }
    catch (error) {
      err.push(`${error}`);
    }
  }
  return err;
}

function isBackendApp() {
  return _.includes(manifest.features, 'backend');
}

module.exports = {
  validate() {
    let errMsgs = [];

    try {
      if (_.isEmpty(manifest.actions)) {
        return ;
      }

      if (!isBackendApp()) {
        errMsgs.push('App is not a backend app');
        return _.flattenDeep(errMsgs);
      }

      errMsgs = _.flattenDeep(validateActionStructure());
      if (_.isEmpty(errMsgs)) {
        actionPayloadGenerator.createFakeJSON();
      }

      return _.flattenDeep(errMsgs);
    }
    catch (e) {
      debuglog(e);
      return [`Exception occured while validation: ${e.message}`];
    }
  },
  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
