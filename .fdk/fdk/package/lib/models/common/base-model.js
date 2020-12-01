'use strict';

const { Model } = require('sequelize');

/**
 * Class representing an BaseModel with findBy And findAllBy
 */
class BaseModel extends Model {
  /**
   * Finds the Model instance
   *
   * @param {object} predicates - search attributes
   * @param {Array} attributes - include attributes
   * @param {object} options - object containing meta
   * @returns {object} sequelize model
   */
  static findBy(predicates, attributes, options) {
    return this.findOne({
      where: predicates,
      attributes,
      ...options
    });
  }

  /**
   * Find all Model instances
   *
   * @param {object} predicates - search attributes
   * @param {Array} attributes - include attributes
   * @param {object} options - object containing meta
   * @returns {object} sequelize model
   */
  static findAllBy(predicates, attributes, options) {
    return this.findAll({
      where: predicates,
      attributes,
      ...options
    });
  }
}

module.exports = BaseModel;
