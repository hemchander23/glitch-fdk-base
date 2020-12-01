'use strict';

const entitySchema = require('./entity');

const recordSchema = require('./record');

module.exports = {
  ...entitySchema,
  ...recordSchema
};
