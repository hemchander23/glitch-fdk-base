'use strict';
const { DataTypes } = require('sequelize');

const BaseModel = require('./common/base-model');

const { model: { limit: { entity } } } = require('../validations/constants');

const entityAttributes = {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  product_name: {
    type: DataTypes.STRING(entity.productName),
    allowNull: false
  },
  organisation_id: {
    type: DataTypes.STRING(entity.organisationId),
    allowNull: false
  },
  tenant_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(entity.name),
    allowNull: false
  },
  prefix: {
    type: DataTypes.STRING(entity.prefix),
    allowNull: false
  },
  deleted: {
    type: DataTypes.BOOLEAN
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
};

/**
 * Returns a defined set of scopes to be passed as part of the model
 * initialization
 */
function getScopes(models) {
  return {
    default: {
      include: [{
        model: models.EntityField,
        as: 'fields',
        required: true,
        attributes: {
          exclude: [
            'created_at',
            'updated_at',
            'entity_id'
          ]
        }
      }]
    },

    /**
     * Returns scope definition to filter by name
     *
     * @param {string} name - name of the entity
     * @returns {object} scope definition
     */
    byName(name) {
      return {
        where: {
          name
        }
      };
    }
  };
}

class Entity extends BaseModel {
  static initialize(sequelize, models) {
    Entity.init(entityAttributes, {
      tableName: 'entities',
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
    Entity.hasMany(models.EntityField, {
      as: 'fields',
      foreignKey: 'entity_id'
    });

    Entity.hasMany(models.Record, {
      as: 'records',
      foreignKey: 'entity_id'
    });
  }

  /**
   * converts the current model instance to its equivalent JSON representation
   *
   * @returns {object} - JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      prefix: this.prefix,
      fields: this.fields
   };
 }
}

module.exports = Entity;
