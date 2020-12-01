'use strict';
const { DataTypes } = require('sequelize');

const BaseModel = require('./common/base-model');

const bigintPivotAttributes = {
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
    type: DataTypes.BIGINT,
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

class BigintPivot extends BaseModel {
  static initialize(sequelize, models) {
    BigintPivot.init(bigintPivotAttributes, {
      tableName: 'bigint_pivots',
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
    BigintPivot.belongsTo(models.Entity, {
      as: 'entity'
    });
    BigintPivot.belongsTo(models.EntityField, {
      as: 'entity_field'
    });
    BigintPivot.belongsTo(models.Record, {
      as: 'record'
    });
  }
}

module.exports = BigintPivot;
