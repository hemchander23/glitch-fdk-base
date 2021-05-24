'use strict';

const debuglog = __debug.bind(null, __filename);

const DP_ROUTER_PATH = '/dprouter';

const Router = require('express').Router;
const dpRouter = new Router();
const { validatePayload } = require('../middlewares/validator');
const { globalErrorHandler } = require('../middlewares/error');
const configUtil = require('../utils/config-util');
const { asyncHandler } = require('../utils/helper-util');
const manifest = require('../manifest');
const {
  status:{
    not_found,
    forbidden
  }
} = require('../utils/http-util');
const INVALID_ROUTE_MESSAGE = 'Route not allowed';

function dpRouterExec(req, res) {
  const route = req.headers['mkp-route'],
        action = req.body.action;

  req.meta = {
    product: req.query.product || Object.keys(manifest.product)[0]
  };

  debuglog(`received call for route "${route}" with action "${action}" and body ${JSON.stringify(req.body)}`);
  if (configUtil.isValidRoute(req.headers['mkp-route'], req.meta.product)) {
    if (!configUtil.isAllowedIssuerRoute(req.headers['mkp-auth-token'], req.headers['mkp-route'])) {
      return res.status(forbidden).send({
        message: INVALID_ROUTE_MESSAGE, status: forbidden
      });
     }
    const dynamicRoute = require(`../api/${req.headers['mkp-route']}`);

    return dynamicRoute[action](req, res);
  }

  return res.status(not_found).send({
    message: INVALID_ROUTE_MESSAGE, status: not_found
  });
}

dpRouter.use((req, res, next) => {
  req.meta = {
    product: req.query.product || Object.keys(manifest.product)[0]
  };

  return asyncHandler(validatePayload(req.headers['mkp-route'], req.body.action))(req, res, next);
});

dpRouter.post(DP_ROUTER_PATH, asyncHandler(dpRouterExec));

dpRouter.use(globalErrorHandler);


module.exports = dpRouter;
