'use strict';

const { RecordNotFoundError } = require('../utils/error-util');
const { Entity, EntityField } = require('../models/index');

const ORG_ID = 1;
const TENANT_ID = 1;

/**
 * creates the entity fields for the given entity
 *
 * @param {object} entity - entity instance
 * @param {Array} fields - an array of entity fields
 */
async function createEntityFields(entity, fields) {
  for (const field of fields) {
    await EntityField.create({
      entity_id: entity.id,
      name: field.name,
      label: field.label,
      type: field.type,
      filterable: field.filterable,
      required: field.required
    });
  }
}

/**
 * creates the entity
 *
 * @param {object} entityData - data about the entity
 */
async function createEntity(entityData) {
  const entity = await Entity.create({
    name: entityData.name,
    prefix: entityData.prefix,
    product_name: entityData.product_name,
    organisation_id: ORG_ID,
    tenant_id: TENANT_ID
  });

  await createEntityFields(entity, entityData.fields);
}

/**
 * get entity by name
 *
 * @param {object} params - parameters to filter the entities
 */
async function getEntity(name) {
  const entity = await Entity.scope('default').findBy({ name });

  if (!entity) {
    throw new RecordNotFoundError('entity not found');
  }

  return entity;
}

module.exports = {
  createEntity,
  getEntity
};
