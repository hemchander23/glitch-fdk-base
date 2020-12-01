'use strict';

const { DataTypes, Op } = require('sequelize');

const BaseModel = require('./common/base-model');

const customObjectUtils = require('../utils/custom-objects.js');

const recordAttributes = {
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
  display_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  record: {
    type: DataTypes.TEXT,
    allowNull: false,
    set(value) {
      this.setDataValue('record', JSON.stringify(value));
    },
    get(attribute) {
      return JSON.parse(this.getDataValue(attribute));
    }
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
  return {
    byFilteredRecordId(recordIds, offsetRecordId) {
      if (recordIds.length > 0) {
        return {
          where: {
            id: {
              [Op.in]: recordIds,
              [Op.gte]: offsetRecordId || 0
            }
          }
        };
      }
      return {
        where: {
          id: {
            [Op.gte]: offsetRecordId || 0
          }
        }
      };
    }
  };
}

/**
 * Returns a defined set of model hooks to be passed as part of the model
 * initialization
 *
 * @returns {object} hook definitions
 */
function getHooks() {
  return {
    beforeCreate: (record, options) => customObjectUtils.isValidRecord(record.record, options),
    beforeUpdate: (record, options) => customObjectUtils.isValidRecord(record.record, options)
  };
}

class Record extends BaseModel {
  static initialize(sequelize, models) {
    Record.init(recordAttributes, {
      tableName: 'records',
      sequelize: sequelize,
      scopes: getScopes(models),
      hooks: getHooks()
    });
  }

  /**
   * Adds association to other models
   *
   * @param  {object} models - An object containing all models
   * @memberof models/user~User
   */
  static associate(models) {
    Record.belongsTo(models.Entity, {
      as: 'entity'
    });
    Record.hasMany(models.BigintPivot, {
      as: 'int_pivots',
      onDelete: 'cascade',
      foreignKey: 'record_id'
    });
    Record.hasMany(models.StringPivot, {
      as: 'string_pivots',
      onDelete: 'cascade',
      foreignKey: 'record_id'
    });
  }

  /**
   * converts the current model instance to its equivalent JSON representation
   *
   * @returns {object} - JSON representation
   */
  toJSON() {
    return {
      display_id: this.display_id,
      created_time: this.created_at,
      updated_time: this.updated_at,
      data: this.record
    };
  }
}

module.exports = Record;
