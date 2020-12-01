'use strict';

const error = {
  missingName: 'Mandatory attribute \'EntityName\' is missing',
  invalidEntityName: '\'Entity name\' should be a string',
  recordKey: '\'id\' should be a string',
  invalidOptions: '\'options\' should be an object',
  invalidRecordId: '\'record.id\' should be a string',
  invalidEntityVersion: 'Invalid entity version'
};

const services = {
  routes: {
    entity: 'entity',
    record: 'record'
  },
  actions: {
    fetch: 'fetch',
    create: 'create',
    update: 'update',
    delete: 'delete'
  }
};

module.exports = {
  entity: {
    services,
    error
  },
  isValidObject: obj => obj && obj.constructor.name === 'Object',
  isValidString: obj => obj && obj.constructor.name === 'String' && obj.length > 0
};
