'use strict';

const debuglog = __debug.bind(null, __filename);

const manifest = require('../manifest');
const validationConst = require('./constants').validationContants;
const { validate } = require('../utils/validator/');

const MAX_ENTITY_LIMIT = 5;

function formatErrors(entityName, error) {
  error = error.toJSON();

  return error.map(e => `In entity '${entityName}', ${e.name} ${e.message}`);
}

module.exports = {
  name: 'custom-objects',

  async validate() {
    const entities = Object.entries(manifest.entities);
    const errorMessages = [];

    if (entities.length > MAX_ENTITY_LIMIT) {
      errorMessages.push('Maximum Entity definition count is 5.');
    }

    for (const [ name, entityDefinition ] of entities) {
      debuglog(`validating entity definition for "${name}"`);

      try {
        await validate('entity', 'create', entityDefinition);
      }
      catch (error) {
        errorMessages.push(formatErrors(name, error));
      }
    }

    return errorMessages;
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
