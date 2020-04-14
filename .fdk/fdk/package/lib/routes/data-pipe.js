'use strict';

const DP_ROUTER_PATH = '/dprouter';

const Router = require('express').Router;
const dpRouter = new Router();
const configUtil = require('../utils/config-util');
const INVALID_ROUTE_ERROR = 404;
const INVALID_ROUTE_MESSAGE = 'Route not allowed';

const dpRouterExec = function(req, res) {

  if (configUtil.isValidRoute(req.headers['mkp-route'])) {
    const dynamicRoute = require(`../api/${req.headers['mkp-route']}`);

    return dynamicRoute[req.body.action](req, res);
  }

  return res.status(INVALID_ROUTE_ERROR).send({
    message: INVALID_ROUTE_MESSAGE, status: INVALID_ROUTE_ERROR
  });
};

dpRouter.post(DP_ROUTER_PATH, dpRouterExec);

module.exports = dpRouter;
