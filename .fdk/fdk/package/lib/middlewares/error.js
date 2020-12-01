'use strict';

const debuglog = __debug.bind(null, __filename);

const { BaseError } = require('../utils/error-util');
const http = require('../utils/http-util');

/**
 * Global error handler
 *
 * This acts as the catch all middleware for any uncaught errors in the request
 * execution flow
 *
 * @param {Error} error - Error object
 * @param {Request} req - Express Request
 * @param {Response} res - Express Response
 * @param {NextFunction} next - Express Next function
 */
function globalErrorHandler(error, req, res, next) {
  /**
   * Delegate  error to the default Express error handler, when the headers have
   * already been sent to the client. This would happen in asynchronous route
   * handlers when next is called with an error after the response has been sent.
   * Reference - https://expressjs.com/en/guide/error-handling.html
   */
  if (res.headersSent) {
    return next(error);
  }

  debuglog(`uncaught exception while handling web request "${error.stack}"`);

  if (error instanceof BaseError) {
    return res.status(error.status).send({
      message: error.message,
      status: error.status,
      errors: error,
      errorSource: error.errorSource
    });
  }

  return res.status(http.status.internal_server_error).send({
    message: 'Something went wrong'
  });
}

module.exports = {
  globalErrorHandler
};
