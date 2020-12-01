'use strict';

const { DataTypes } = require('sequelize');

const BaseModel = require('./common/base-model');

const { model: { limit: { entityField } } } = require('../validations/constants');

const entityFieldAttributes = {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  entity_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(entityField.type),
    allowNull: false
  },
  required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  filterable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  parent_field_id: {
    type: DataTypes.BIGINT
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false
  }
};

/**
 * Returns a defined set of scopes to be passed as part of the model
 * initialization
 */
function getScopes() {
  return {};
}

class EntityField extends BaseModel {
  static initialize(sequelize, models) {
    EntityField.init(entityFieldAttributes, {
      tableName: 'entity_fields',
      sequelize: sequelize,
      scopes: getScopes(models)
    });
  }

  /**
   * Adds association to other models
   *
   * @param  {object} models - An object containing all models
   * @memberof models/user~User
   */
  static associate() {
  }

  /**
   * converts the current model instance to its equivalent JSON representation
   *
   * @returns {object} - JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      label: this.label,
      type: this.type,
      required: this.required,
      filterable: this.filterable
   };
 }
}

module.exports = EntityField;
