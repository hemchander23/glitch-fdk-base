'use strict';

const debuglog = __debug.bind(null, __filename);

const url = require('url');
const inquirer = require('inquirer');
const { QueryTypes } = require('sequelize');

const { model: modelConstants } = require('../validations/constants');

const manifest = require('../manifest');

const { crypto } = require('./helper-util.js');
const sequelize = require('../instances/sequelize');
const { DataStore, entityDB } = require('./data-util.js');
const { printError, ValidationError, CustomObjectError } = require('./error-util.js');
const ISO_DATE_REGEX = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

const syncStateStore = new DataStore();

function isValidDateFormat(value) {
  return ISO_DATE_REGEX.test(value);
}

const fieldDatatypes = {
  TEXT: 'string',
  PARAGRAPH: 'string',
  CHECKBOX: 'boolean',
  DATE_TIME: 'string',
  NUMBER: 'number',
  DECIMAL: 'number'
};

const TENANT_ID = 1;

/**
 * Utility function to sync all the entities defined in entities.json into
 * the sqlite database implicitly.
 *
 * @param {object} forceResyncEntities - drop existing entities
 */
async function syncEntities(forceResyncEntities) {
  const entities = manifest.entities;
  const hasEntitiesDefined = Object.keys(entities).length !== 0;

  const storedEntityHash = syncStateStore.fetch('entityHash');
  const currentEnitityHash = crypto.md5Digest(JSON.stringify(entities));

  debuglog(`to force or not? ${forceResyncEntities}`);

  if (!forceResyncEntities && storedEntityHash !== undefined) {
    if (storedEntityHash === currentEnitityHash) {
      debuglog('no change detected in entities definition, skipping sync');
      return;
    }

    debuglog('change detected, prompting to sync');

    const response = await inquirer.prompt({
      type: 'confirm',
      name: 'sync',
      message: 'Changes to entities.json detected! Would you like to re-sync definitions in localDB? Re-sync is irreversible!'
    });

    if (response.sync !== true) {
      return printError(
        'Cannot proceed without resyncing localDB!',
        ['Mismatch in entities definition'],
        true
      );
    }

    debuglog('developer confimed, deciding to re-sync');
  }

  debuglog('beginning to re-sync db');

  await entityDB.teardown();
  await entityDB.setup();

  const { createEntity } = require('../actions/entity');

  for (const product in manifest.product) {
    for (const [entity, entityDefinition] of Object.entries(entities)) {
      debuglog(`creating entity named "${entity}" for product "${product}"`);

      await createEntity({
        name: entity,
        prefix: entity.slice(0, modelConstants.limit.entity.prefix),
        product_name: product,
        ...entityDefinition
      });
    }
  }

  if (hasEntitiesDefined) {
    syncStateStore.store('entityHash', currentEnitityHash);
  } else {
    syncStateStore.delete('entityHash', currentEnitityHash);
  }

  debuglog('updated local store with latest entity hash');
}

/**
 * Returns the list of filterable fields for entity
 * @param {object} entity - entity details
 */
function getEntityFields(entity, filterable = false) {
  const { EntityField } = require('../models');
  const scope = { entity_id: entity.id };

  if (filterable) {
    scope.filterable = true;
  }
  return EntityField.findAll({
    where: scope
  });
}

function validateField(fieldDefinition, record) {
  const {
    name: fieldName,
    type: fieldType,
    required
  } = fieldDefinition;

  /**
   * Empty fields will be added with null value, hence no need to check for '!record.hasOwnProperty'
   * Required field should not be null
   *
   */
  if (!!required && record[fieldName] === null) {
    return {
      dataPath: '/record',
      message: `should have required property '${fieldName}'`
    };
  }

  if (!record.hasOwnProperty(fieldName)) {
    return;
  }

  const recordFieldType = typeof record[fieldName];

  // Non-required field can be null
  if (recordFieldType !== fieldDatatypes[fieldType] && record[fieldName] !== null) {
    return {
      dataPath: `/record/${fieldName}`,
      message: `incorrect datatype, expected '${fieldDatatypes[fieldType]}' got '${recordFieldType}'`
    };
  }
}

function validateDateField(fieldDefinition, record) {
  const {
    name: fieldName
  } = fieldDefinition;

  // DATE_TIME expected to be of ISO format
  if (!isValidDateFormat(record[fieldName]) && record[fieldName] !== null) {
    return {
      dataPath: `/record/${fieldName}`,
      message: `Invalid date format (given: ${record[fieldName]}, expected: YYYY-MM-DD'T'HH:MM:SS.SSSZ) `
    };
  }
}

function getAddtionalPropertiesErrors(entityDefinition, record) {
  const additionalProperties = Object.keys(record)
    .filter(field => !entityDefinition.fields.some(entity => entity.name === field));

  debuglog(`identified the following additionalProperties '${additionalProperties}'`);

  return additionalProperties.map(additionalProperty => ({
    dataPath: '/record',
    message: `unexpected property '${additionalProperty}'`
  }));
}

function isValidRecord(record, options) {
  const entityName = options.meta.entity.name;

  // it already guaranteed that this entity will be defined in the manifest
  const entityDefinition = manifest.entities[entityName];

  const errors = [
    ...entityDefinition.fields.map(field => validateField(field, record)).filter(e => !!e),
    ...entityDefinition.fields
      .filter(field => field.type === 'DATE_TIME')
      .map(field => validateDateField(field, record))
      .filter(e => !!e),
    ...getAddtionalPropertiesErrors(entityDefinition, record)
  ];

  if (errors.length) {
    throw new ValidationError('validation failed', { errors });
  }
}

async function addNullToMissingFields(record, entity) {
  const entityFields = await getEntityFields(entity);
  const nullFactoredRecord = { ...record };

  entityFields.forEach(entityField => {
    const fieldName = entityField.name;

    if (!record[fieldName]) {
      nullFactoredRecord[fieldName] = null;
    }
  });
  debuglog('Adding null to missing fields', record);
  return nullFactoredRecord;
}

/**
 * Groups incoming query params
 *
 * @param {object} reqQuery
 */
function groupQueryParams(reqQuery) {
  /**
   * [{ a:1, a:2}] => { a: [1,2] }
   */
  const queryCluster = {};

  reqQuery.forEach(query => {
    const [[fieldName, value]] = Object.entries(query);

    if (!queryCluster[fieldName]) {
      queryCluster[fieldName] = [];
    }
    queryCluster[fieldName].push(value);
  });

  debuglog(`clustered query param ${queryCluster}`);

  return queryCluster;
}

/**
 * Clusters query params and add additional detail useful for querying
 * @param {*} entity
 * @param {*} reqQuery
 */
async function constructQueryParams(entity, reqQuery) {
  const clusteredQueryParam = groupQueryParams(reqQuery);
  const filterableFields = await getEntityFields(entity, true);
  const filterableFieldsMap = {};

  filterableFields.forEach(field => {
    filterableFieldsMap[field.name] = field;
  });

  /**
   * INPUT: { a: [1,2] }
   * RESULT : [{ entity_id: 1, entity_field_id:1, field_value: [1,2], table: bigint_pivots }]
   */
  return Object.keys(clusteredQueryParam).map(fieldName => {
    const fieldDetail = filterableFieldsMap[fieldName];

    if (!fieldDetail) {
      throw new CustomObjectError(`'${fieldName}' not a filterable field`);
    }

    // DATE_TIME validation for query
    if (fieldDetail.type === 'DATE_TIME') {
      const errors = clusteredQueryParam[fieldName]
        .map(queryValue => validateDateField(fieldDetail, { [fieldName]: queryValue }))
        .filter(e => !!e);

      if (errors.length) {
        throw new ValidationError('validation failed', { errors });
      }
    }

    return {
      entity_id: entity.id,
      entity_field_id: fieldDetail.id,
      field_value: clusteredQueryParam[fieldName],
      table: fieldDetail.type === 'NUMBER' ? 'bigint_pivots' : 'string_pivots'
    };
  });
}

/**
 * Return the set of record_id matching the query
 *
 * @param {object} entity - entity detail
 * @param {object} filterParam - req query param
 */
async function getMatchingRecordIds(entity, filterParam) {
  const queryParams = await constructQueryParams(entity, filterParam);
  const queryList = queryParams.map(queryParam => {
    const quotedValue = '\'' + queryParam.field_value
      .map(param => escape(param))
      .join('\',\'') + '\'';

    return `SELECT distinct record_id FROM ${queryParam.table}
      WHERE field_value IN (${quotedValue})
      AND entity_field_id = ${queryParam.entity_field_id}
      AND entity_id = ${queryParam.entity_id}
      AND tenant_id = ${TENANT_ID}`;
  });

  const query = queryList.join(' INTERSECT ');

  debuglog(`Fetching record_ids : ${query}`);

  const recordIds = await sequelize.query(query, { type: QueryTypes.SELECT });

  if (recordIds.length === 0) {
    return [ -1 ];
  }
  return recordIds.map(recordId => recordId.record_id);
}

/**
 * Encodes for next_link token
 * @param {object} record - record detail
 */
function encodeRecordData(record) {
  const encodedData = {
    id: record.id
  };

  return Buffer.from(JSON.stringify(encodedData)).toString('base64');
}
/**
 * Decodes the next_link token
 * @param {string} recordString - stringified json of record detail
 */
function decodeRecordData(recordString) {
  return JSON.parse(Buffer.from(recordString, 'base64').toString('ascii'));
}

/**
 * Decodes and fetchest the next record to be fetch from pagination token
 * @param {string} nextRecordLink - next page url
 */
function getRecordIdFromToken(nextRecordLink) {
  try {
    const nextToken = url.parse(nextRecordLink, true).query.next_token;
    const recordDetail = decodeRecordData(nextToken);

    return recordDetail.id;
  } catch (error) {
    throw new CustomObjectError('Error while parsing pagination link');
  }
}

/**
 * Generates the next page link for pagination
 * @param {object} req - express req
 * @param {object} lastRecord - latest record detail
 * @param {number} limit - page size
 */
function getNextLink(req, lastRecord, limit) {
  const baseUrl = url.format({
    protocol: req.protocol,
    host: req.get('host'),
    pathname: req.path
  });
  const token = encodeRecordData(lastRecord);

  return `${baseUrl}?page_size=${limit}&next_token=${token}`;
}

// moved module.exports to the top given there is an unavoidable cyclic dep
module.exports = {
  syncEntities,
  isValidRecord,
  getMatchingRecordIds,
  getEntityFields,
  encodeRecordData,
  getRecordIdFromToken,
  getNextLink,
  addNullToMissingFields
};
