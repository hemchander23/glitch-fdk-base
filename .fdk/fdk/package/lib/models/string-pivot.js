'use strict';

const { DataTypes } = require('sequelize');

const BaseModel = require('./common/base-model');

const stringPivotAttributes = {
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
  entity_field_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  field_value: {
    type: DataTypes.STRING,
    allowNull:false
  },
  is_present:{
    type: DataTypes.BOOLEAN
  },
  record_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  tenant_id: {
    type: DataTypes.BIGINT,
    allowNull: false
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

class StringPivot extends BaseModel {
  static initialize(sequelize, models) {
    StringPivot.init(stringPivotAttributes, {
      tableName: 'string_pivots',
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
  static associate(models) {
    StringPivot.belongsTo(models.Entity, {
      as: 'entity'
    });
    StringPivot.belongsTo(models.EntityField, {
      as: 'entity_field'
    });
    StringPivot.belongsTo(models.Record, {
      as: 'record'
    });
  }
}

module.exports = StringPivot;
