'use strict';

const { validators, validate } = require('../utils/validator');

/**
 * Middleware to validate the request body against JSON schema
 *
 * @param {string} route - route name
 * @param {object} options - options to include extra params to payload
 * includeMeta - true to include meta information of the request to the validate payload
 * includeParams - include request params
 * addDefault - list to add default value from validated payload to body
 */
function validatePayload(route, action) {
  if (!(validators.hasOwnProperty(route) && validators[route].hasOwnProperty(action))) {
    return (req, res, next) => next();
  }

  return async (req, res, next) => {
    await validate(route, action, req.body.data);

    next();
  };
}

module.exports = {
  validatePayload
};
