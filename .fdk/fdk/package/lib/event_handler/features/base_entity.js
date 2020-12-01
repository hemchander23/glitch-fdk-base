'use strict';

const debuglog = __debug.bind(null, __filename);

const { Entity, V1Entity } = require('./entity');

const { entity } = require('../helper');

/**
 * A base implementation for the wrapper of Entity API
 */
class BaseEntity {
  /**
   * BaseEntity constructor
   *
   * @param {object} args - arguments passed from the framework initialization
   */
  constructor(args) {
    this.args = args;
    this.Entity = Entity;
  }

  /**
   * get the entity instance
   *
   * @param {string} name - entity name
   */
  get(name) {
    return new this.Entity(name, this.args);
  }
}

/**
 * v1 implementation of base entity wrapper
 *
 * @augments BaseEntity
 */
class V1BaseEntity extends BaseEntity {
  /**
   * V1BaseEntity constructor
   *
   * @param {object} args - arguments passed from the framework initialization
   */
  constructor(args) {
    super(args);
    this.Entity = V1Entity;
    debuglog('v1 API for Entity in use');
  }
}

const versions = {
  v1: V1BaseEntity
};

/**
 * Factory function for versioned entities
 *
 * @param {object} args - arguments passed from the framework initialization
 */
function entityFactory(args) {
  if (args.version in versions) {
    return new versions[args.version](args);
  }
  args.printLog('error', 'Unsupported API for Entity in use');
  throw new Error(entity.error.invalidEntityVersion);
}


module.exports = entityFactory;
