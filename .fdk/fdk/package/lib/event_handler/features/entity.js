'use strict';

const debuglog = __debug.bind(null, __filename);

const request = require('request');
const jQueryDeferred = require('jquery-deferred');

const { entity, isValidObject, isValidString } = require('../helper');

const httpUtil = require('../../utils/http-util');

const SUCCESS_STATUS = [
  httpUtil.status.ok,
  httpUtil.status.created
];

const DPROUTER_URL = 'http://localhost:3000/dprouter';
const POST = 'post';

/**
 * Entity and Record MS base implementation
 *
 * @augments Base
 */
class Entity {
  /**
   * Entity constructor
   *
   * @param {string} name - entity name
   * @param {object} args - framework arguments
   */
  constructor(name) {
    this.name = name;
  }

  makeCall(body, defer, route = entity.services.routes.record) {
    request({
      method: POST,
      url: DPROUTER_URL,
      headers: {
        'MKP-ROUTE': route
      },
      json: body
    }, (error, response, body) => {
      if (SUCCESS_STATUS.includes(response.statusCode)) {
        defer.resolve(body);
      }
      else {
        defer.reject(body);
      }
    });

    return defer;
  }

  /**
   * fetch entity schema
   */
  schema() {
    debuglog('info', 'Fetching schema for loaded entity');

    const defer = jQueryDeferred.Deferred();

    const body = {
      action: entity.services.actions.fetch,
      data: {
        entity: { name: this.name }
      }
    };

    return this.makeCall(body, defer, entity.services.routes.entity);
  }

  /**
   * create record
   *
   * @param {object} params - input parameters
   */
  create(params) {
    debuglog('Creating record for loaded entity');

    const defer = jQueryDeferred.Deferred();

    if (isValidObject(params)) {
      const body = {
        action: entity.services.actions.create,
        data: {
          entity: { name: this.name },
          record: { ...params }
        }
      };

      return this.makeCall(body, defer);
    }

    return defer.reject(new Error(entity.error.invalidOptions));
  }

  /**
   * get all records
   *
   * @param {object} params - input query parameters
   */
  getAll(params) {
    debuglog('Fetching all records for loaded entity');

    const defer = jQueryDeferred.Deferred();

    if (isValidObject(params)) {
      const body = {
        action: entity.services.actions.fetch,
        data: {
          entity: { name: this.name },
          record: { ...params }
        }
      };

      return this.makeCall(body, defer);
    }

    return defer.reject(new Error(entity.error.invalidOptions));
  }

  /**
   * get single record
   *
   * @param {string} id - id of record
   */
  get(id) {
    debuglog('Fetching record for loaded entity');

    const defer = jQueryDeferred.Deferred();

    if (isValidString(id)) {
      const body = {
        action: entity.services.actions.fetch,
        data: {
          entity: { name: this.name },
          record: { id }
        }
      };

      return this.makeCall(body, defer);
    }

    return defer.reject(new Error(entity.error.invalidRecordId));
  }

  /**
   * update record
   *
   * @param {string} id - id of the record
   * @param {object} params - parameters for the update action
   */
  update(id, params) {
    debuglog('Updating record for loaded entity');

    const defer = jQueryDeferred.Deferred();

    if (isValidString(id) && isValidObject(params)) {
      const body = {
        action: entity.services.actions.update,
        data: {
          entity: { name: this.name },
          record: { id, ...params }
        }
      };

      return this.makeCall(body, defer);
    }

    return defer.reject(new Error(!isValidString(id) ? entity.error.invalidRecordId :
      entity.error.invalidOptions));
  }
  /**
   * delete record
   *
   * @param {*} id - id of record
   */
  delete(id) {
    debuglog('Deleting record for loaded entity');

    const defer = jQueryDeferred.Deferred();

    if (isValidString(id)) {
      const body = {
        action: entity.services.actions.delete,
        data: {
          entity: { name: this.name },
          record: { id }
        }
      };

      return this.makeCall(body, defer);
    }

    return defer.reject(
      new Error(isValidString(id) ? entity.error.invalidRecordId : entity.error.invalidOptions));
  }
}

/**
 * v1 implemetation of Entity
 *
 * @augments Entity
 */
class V1Entity extends Entity {
  /**
   * Entity constructor
   *
   * @param {string} name - name of entity
   * @param {object} args - framework arguments
   */
  constructor(name, args) {
    super(name, args);
    if (!name) {
      throw new Error(entity.error.missingName);
    }
    if (!isValidString(name)) {
      throw new Error(entity.error.invalidEntityName);
    }
  }
}

module.exports = {
  Entity,
  V1Entity
};
