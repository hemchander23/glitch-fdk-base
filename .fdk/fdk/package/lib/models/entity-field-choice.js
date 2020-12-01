'use strict';

const { DataTypes } = require('sequelize');

const BaseModel = require('./common/base-model');

const entityFieldChoiceAttributes = {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  entity_field_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
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

class EntityFieldChoice extends BaseModel {
  static initialize(sequelize, models) {
    EntityFieldChoice.init(entityFieldChoiceAttributes, {
      tableName: 'entity_field_choices',
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
      id: this.id,
      entity_field_id: this.entity_field_id,
      value: this.value,
      deleted: this.deleted
   };
 }
}

module.exports = EntityFieldChoice;
