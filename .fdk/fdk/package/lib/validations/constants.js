'use strict';

module.exports = {
  validationContants: Object.freeze({
    ALL_VALIDATION: 'all',
    PRE_PKG_VALIDATION: 'pre_pkg_validation',
    POST_PKG_VALIDATION: 'post_pkg_validation',
    RUN_VALIDATION: 'run_validation'
  }),
  actions: {
    INCREMENT: 'increment',
    APPEND: 'append',
    SET: 'set',
    REMOVE: 'remove'
  },
  model: {
    limit: {
      entity: {
        productName: 32,
        organisationId: 32,
        name: 30,
        prefix: 5
      },
      entityField: {
        type: 32
      }
    }
  }
};