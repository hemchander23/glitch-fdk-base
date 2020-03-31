'use strict';

const _ = require('lodash');

class CustomError extends Error {
  constructor(exp, ...params) {
    super(...params);
    Error.captureStackTrace(this, CustomError);
    this.message = exp.message;
    this.code = exp.code;
    this.name = CustomError.name;
  }
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

  printError: function(title, messages) {
    messages = normalize(messages);

    if (!_.isEmpty(messages.warnings)) {
      console.log('Please ensure that the following are addressed for quick review process.');
      messages.warnings.forEach(message => console.log(`\x1b[33m[WARN]\x1b[0m ${message.value}`));

      // Dont remove. Here for prettyfying the output
      console.log();
    }

    if (!_.isEmpty(messages.errors)) {
      console.log(title);
      messages.errors.forEach(message => console.log(`\x1b[31m[ERROR]\x1b[0m ${message.value}`));

      process.exit(1);
    }
  },
  CustomError
};