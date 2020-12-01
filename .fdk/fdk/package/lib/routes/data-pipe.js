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
const INVALID_ROUTE_ERROR = 404;
const INVALID_ROUTE_MESSAGE = 'Route not allowed';

function dpRouterExec(req, res) {
  const route = req.headers['mkp-route'],
        action = req.body.action;

  req.meta = {
    product: req.query.product || Object.keys(manifest.product)[0]
  };

  debuglog(`received call for route "${route}" with action "${action}" and body ${JSON.stringify(req.body)}`);

  if (configUtil.isValidRoute(route, req.meta.product)) {
    const dynamicRoute = require(`../api/${route}`);

    return dynamicRoute[action](req, res);
  }

  return res.status(INVALID_ROUTE_ERROR).send({
    message: INVALID_ROUTE_MESSAGE, status: INVALID_ROUTE_ERROR
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
