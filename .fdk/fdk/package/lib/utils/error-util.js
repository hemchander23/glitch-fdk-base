'use strict';

const { isEmpty } = require('lodash');
const http = require('../utils/http-util');

class CustomError extends Error {
  constructor(exp, ...params) {
    super(...params);
    Error.captureStackTrace(this, CustomError);
    this.message = exp.message;
    this.code = exp.code;
    this.name = CustomError.name;
  }
}

class BaseError extends Error {
    /**
   * Base class constructor
   *
   * @param {object} message - error message
   * @param {object} args - arguments contains the errors and context
   */
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Validation error class extends base class
 */
class ValidationError extends BaseError {
  /**
   * Validation constructor sets the status as BAD_REQUEST
   *
   * @param {object} message - error message
   * @param {object} args - arguments contains the errors and context
   */
  constructor(message, args = {}) {
    super(message, args);
    this.name = this.constructor.name;
    this.status = http.status.bad_request;
    this.errors = args.errors;
    this.errorSource = 'APP';
  }

  /**
   * convert errors and message into JSON with key message
   *
   * @returns {object} json errors and message
   */
  toJSON() {
    if (Array.isArray(this.errors)) {
      return this.errors.map(error => {
        const { dataPath: name, message } = error;

        return {
          name,
          message
        };
      });
    }

    return [{
      message: this.message
    }];
  }
}

/**
 * Record not found error class extends base class
 */
class RecordNotFoundError extends BaseError {
  /**
   * Record not found constructor sets the status as not_found
   *
   * @param {object} message - error message
   * @param {object} args - arguments contains the errors and context
   */
  constructor(message, args = {}) {
    super(message, args);
    this.name = this.constructor.name;
    this.status = http.status.not_found;
  }

  toJSON() {}
}

/**
 * Error class for Custom objects
 */
class CustomObjectError extends BaseError {
  /**
   * CustomObject error sets the status as Bad request
   *
   * @param {object} message - error message
   * @param {object} args - arguments contains the errors and context
   */
  constructor(message, args = {}) {
    super(message, args);
    this.name = this.constructor.name;
    this.status = http.status.bad_request;
  }

  toJSON() {}
}

const ERROR = 2,
  WARN = 1;

function normalize(messages) {
  messages = messages.map(message => {
    if (typeof message === 'string') {
      return {
        severity: ERROR,
        value: message
      };
    }

    return message;
  });

  return {
    errors: messages.filter(message => message.severity === ERROR),
    warnings: messages.filter(message => message.severity === WARN)
  };
}

module.exports = {
  error(error, exitStatus) {
    if (undefined === exitStatus) {
      exitStatus = 1;
    }
    console.error(error.message);
    process.exit(exitStatus);
  },

  printError: function (title, messages, exit = true) {
    messages = normalize(messages);

    if (!isEmpty(messages.warnings)) {
      console.log('Please ensure that the following are addressed for quick review process.');
      messages.warnings.forEach(message => console.log(`\x1b[33m[WARN]\x1b[0m ${message.value}`));

      // Dont remove. Here for prettyfying the output
      console.log();
    }

    if (!isEmpty(messages.errors)) {
      console.log(title);
      messages.errors.forEach(message => console.log(`\x1b[31m[ERROR]\x1b[0m ${message.value}`));

      if (exit) {
        process.exit(1);
      }
      console.log();
    }
  },
  CustomError,
  BaseError,
  ValidationError,
  RecordNotFoundError,
  CustomObjectError
};
