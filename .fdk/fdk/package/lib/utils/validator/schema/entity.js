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

const fieldsSchema = {
  type: 'array',
  uniqueItemProperties: ['name'],
  filterFieldLimit: {
    maxLimit: 5
  },
  maxItems: 20,
  items: {
    type: 'object',
    additionalProperties: false,
    properties: {
      name: {
        type: 'string'
      },
      label: {
        type: 'string'
      },
      type: {
        type: 'string',
        enum: [
          'TEXT',
          'PARAGRAPH',
          'CHECKBOX',
          'DATE_TIME',
          'NUMBER',
          'DECIMAL',
          'DROPDOWN'
        ]
      },
      filterable: {
        type: 'boolean',
        validateType: {
          allowedTypes: [
            'TEXT',
            'DATE_TIME',
            'NUMBER'
          ]
        }
      },
      required: {
        type: 'boolean'
      }
    },
    if: {
      properties: {
        type: {
          enum: [
            'TEXT',
            'DATE_TIME',
            'NUMBER',
            'DROPDOWN'
          ]
        }
      }
    },
    then: {
      properties: {
        filterable: {
          type: 'boolean'
        }
      }
    },
    else: {
      not: {
        properties: {
          filterable: {
            type: 'boolean'
          }
        }
      }
    },
    required: [
      'name',
      'label',
      'type'
    ]
  }
};

const entity = {
  create: {
    $async: true,
    type: 'object',
    additionalProperties: false,
    properties: {
      fields: fieldsSchema
    },
    required: [
      'fields'
    ]
  },
  fetch: {
    $async: true,
    type: 'object',
    additionalProperties: false,
    properties: {
      entity: entitySchema
    }
  }
};

module.exports = {
  entity
};
