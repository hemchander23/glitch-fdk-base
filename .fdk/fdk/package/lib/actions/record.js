'use strict';

const debuglog = __debug.bind(null, __filename);

const { getEntity } = require('./entity.js');
const { Record, BigintPivot, StringPivot } = require('../models/');
const { RecordNotFoundError } = require('../utils/error-util');
const {
  getMatchingRecordIds,
  getEntityFields,
  getRecordIdFromToken,
  addNullToMissingFields
} = require('../utils/custom-objects');
const TENANT_ID = 1;

/**
 * constructs dynamic sequelize scopes
 *
 * @param  {string}    methodName - dynamic scope name
 * @param  {...*}      args - arguments of the scope
 * @returns {object}    sequelize scope representation
 */
function constructScope(methodName, ...args) {
  return {
    method: [
      methodName,
      ...args
    ]
  };
}

/**
 * gets a record
 *
 * @param {object} entityData - data about the entity
 * @param {object} recordData - data about the record
 */
async function getRecord(entityData, recordData) {
  const entity = await getEntity(entityData.name);
  const record = await Record.findBy({ entity_id: entity.id, display_id: recordData.id });

  if (!record) {
    throw new RecordNotFoundError('record not found');
  }

  return record;
}

/**
 * Creates pivot entires on record create
 *
 * @param {object} entity - entity db object
 * @param {object} record - record db object
 */
async function createPivotEntries(entity, record) {
  debuglog(`creating pivot entires for ${record.id}`);

  const filterableFields = await getEntityFields(entity, true);
  const recordData = record.record;

  const pivotEntries = filterableFields.map( filterableField => {
    const fieldValue = recordData[filterableField.name];
    const entry = {
      entity_id: entity.id,
      entity_field_id: filterableField.id,
      field_value: escape(fieldValue),
      is_present: !!fieldValue,
      record_id: record.id,
      tenant_id: TENANT_ID
    };

    if (filterableField.type === 'NUMBER' ) {
      return record.createInt_pivot(entry);
    }

    return record.createString_pivot(entry);
  });

  await Promise.all(pivotEntries);
}
/**
 * creates a record
 *
 * @param {object} entityData - data about the entity
 * @param {object} recordData - data about the record
 */
async function createRecord(entityData, recordData) {
  const entity = await getEntity(entityData.name);
  const maxId = await Record.max('id', {
    where: { entity_id: entity.id }
  });

  const nullFactoredRecord = await addNullToMissingFields(recordData, entity);
  const record = await Record.create({
    entity_id: entity.id,
    display_id: `${entity.prefix}-${(maxId || 0) + 1}`,
    record: nullFactoredRecord,
    tenant_id: TENANT_ID
  }, {
    meta: { entity }
  });

  await createPivotEntries(entity, record);

  return record;
}

/**
 * Deletes the pivot entires corresponding to record
 *
 * @param {object} record - record details
 */
async function destroyPivots(record) {
  await BigintPivot.destroy({ where: { record_id: record.id }});
  await StringPivot.destroy({ where: { record_id: record.id }});
}

/**
 * updates a record
 *
 * @param {object} entityData - data about the entity
 * @param {object} recordData - data about the record
 */
async function updateRecord(entityData, recordData) {
  const entity = await getEntity(entityData.name);
  const record = await getRecord(entityData, recordData);

  delete recordData.id;

  const newRecord = await addNullToMissingFields(recordData, entity);

  const updatedRecord = await record.update({
    record: newRecord
  }, { meta: { entity } });

  await destroyPivots(updatedRecord);
  await createPivotEntries(entity, updatedRecord);

  return updatedRecord;
}

/**
 * gets all records by entity
 *
 * @param {object} entityData - data about the entity
 * @param {object} recordData - data about the record
 * @param {object} pagination - pagination details
 */
async function getRecords(entityData, recordData = {}, pagination) {
  const entity = await getEntity(entityData.name);
  const scopes = [];

  let offsetId = null;
  let recordIds = [];

  if (recordData.next) {
    offsetId = getRecordIdFromToken(recordData.next.marker);
  }

  if (recordData.query) {
    const filterParam = recordData.query.$and || recordData.query.$or || [recordData.query];

    if (filterParam) {
      // returns [ -1 ] on no matching records
      recordIds = await getMatchingRecordIds(entity, filterParam);
    }
  }

  scopes.push(constructScope('byFilteredRecordId', recordIds, offsetId));

  debuglog(`fetch records query scopes ${JSON.stringify(scopes)}`);

  return Record.scope(scopes).findAll({
    where: {
      entity_id: entity.id
    },
    limit: pagination.limit + 1
  });
}

/**
 * deletes the record
 *
 * @param {object} entityData - data about the entity
 * @param {object} recordData - data about the record
 */
async function deleteRecord(entityData, recordData) {
  const record = await getRecord(entityData, recordData);

  await destroyPivots(recordData);

  return record.destroy();
}

module.exports = {
  getRecord,
  getRecords,
  createRecord,
  updateRecord,
  deleteRecord
};
