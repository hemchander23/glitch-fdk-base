'use strict';

const nameRegex = '^[a-zA-Z0-9_-]+$';

const entitySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      maxLength: 30,
      minLength: 5,
      pattern: nameRegex
    }
  },
  required: [
    'name'
  ]
};

const recordFieldSchema = {
  [nameRegex]: {
    anyOf: [
      {
        type: 'string',
        maxLength: 2048
      },
      {
        type: 'number'
      },
      {
        type: 'integer'
      },
      {
        type: 'boolean'
      },
      {
        type: 'null'
      }
    ]
  }
};

const defaultRecordSchema = {
  type: 'object',
  additionalProperties: false,
  patternProperties: {
    ...recordFieldSchema
  }
};

const updateRecordSchema = {
  ...defaultRecordSchema,
  properties: {
    id: {
      type: 'string'
    }
  },
  required: [
    'id'
  ]
};

const recordIdSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: {
      type: 'string'
    }
  },
  required: [
    'id'
  ]
};

const queryItems = {
  ...defaultRecordSchema,
  maxProperties: 1
};

const fetchSchema = {
  $async: true,
  additionalProperties: false,
  type: 'object',
  properties: {
    entity: entitySchema,
    record: {
      oneOf: [
        {
          ...recordIdSchema
        },
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            query: {
              minProperties: 1,
              oneOf: [
                queryItems,
                {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    '$and': {
                      type: 'array',
                      items: queryItems,
                      maxItems: 3,
                      minItems: 2
                    },
                    '$or': {
                      type: 'array',
                      items: queryItems,
                      hasSameKey: {},
                      maxItems: 3,
                      minItems: 2
                    }
                  }
                }
              ]
            },
            next: {
              type: 'object',
              additionalProperties: false,
              properties: {
                marker: {
                  type: 'string'
                }
              }
            }
          }
        }
      ]
    }
  },
  required: [
    'entity'
  ]
};

const recordSchema = {
  create: defaultRecordSchema,
  update: updateRecordSchema,
  delete: recordIdSchema
};

const constructSchema = (action) => {
  return {
    $async: true,
    additionalProperties: false,
    type: 'object',
    properties: {
      entity: entitySchema,
      record: recordSchema[action]
    },
    required: [
      'entity',
      'record'
    ]
  };
};

const record = {
  create: constructSchema('create'),
  update: constructSchema('update'),
  delete: constructSchema('delete'),
  fetch: fetchSchema
};

module.exports = {
  record
};
