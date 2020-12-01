'use strict';

const debuglog = __debug.bind(null, __filename);

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const actionsUtil = require('../utils/actions-util');
const validateRequest = require('../validations/schema.js');
const _ = require('lodash');

const Router = require('express').Router;
const actionsRouter = new Router();

const HTTP_ERROR_CODE = 400;

function validateActionResponse(req, res) {
  const action =req.params.action;
  var err = validateRequest.validateSingleAction(action, req.body, 'response');

  if (!_.isEmpty(err)) {
    debuglog('Error while validating action response');
    res.header('showinui', true).status(HTTP_ERROR_CODE).json({
      message: err
    });
  }
  else {
    res.json(req.body);
  }
}

function getSchema(action) {
  for (var item in manifest.actions) {
    var actionItem = manifest.actions[item];

    if (actionItem.name === action) {
      var schema = actionItem.parameters;

      return schema;
    }
  }
}

function getActionData(req, res) {
  const action = req.params.action;

  try {
    const actionData = JSON.parse(fileUtil.readFile(`${process.cwd()}/server/test_data/${action}.json`));
    const schema = getSchema(action);

    var actionResponse = {value:actionData, schema: schema};

    res.json(actionResponse);
  }
  catch (err) {
    debuglog(`Error while parsing ${action}.json`);
    res.json({});
  }
}

function storeActionData(req, res) {
  const action = req.params.action;
  var err = validateRequest.validateSingleAction(action, req.body, 'request');

  if (!_.isEmpty(err)) {
    debuglog(`Error while storing action data for action ${action}`);
    res.header('showinui', true).status(HTTP_ERROR_CODE).json({
      message: err
    });
  }
  else {
    fileUtil.writeFile(`${process.cwd()}/server/test_data/${action}.json`, JSON.stringify(req.body, null, 2));
    res.send();
  }
}

function resetActionData(req, res) {
  const action = req.params.action;
  const actionData = actionsUtil.restoreActionData(action);

  if (actionData !== undefined || !_.isEmpty(actionData)) {
    res.json(actionData);
  }
  else {
    debuglog(`Error while resetting ${action}.json`);
    res.header('showinui', true).status(HTTP_ERROR_CODE).json({
      message: 'Error while resetting action data'
    });
  }
}

function actionsList(req, res){
  res.send({actions: actionsUtil.actionsList()});
}

actionsRouter.get('/web/actions', actionsList);
actionsRouter.get('/web/actions/:action', getActionData);
actionsRouter.post('/web/actions/:action', storeActionData);
actionsRouter.post('/web/actions/reset/:action', resetActionData);
actionsRouter.post('/web/validateAction/:action', validateActionResponse);

module.exports = actionsRouter;
