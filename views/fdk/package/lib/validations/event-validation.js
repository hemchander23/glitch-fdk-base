'use strict';

const _ = require('lodash');

const eventUtil = require('../utils/event-util');
const manifestConfigs = require('../manifest');
const validationConst = require('./constants').validationContants;

const debuglog = __debug.bind(null, __filename);
const VALID_KEYS = ['event', 'callback'];

function validateEvents(evtHash) {
  const errMsgs = [];
  const eventsArr = [];
  const events = evtHash.events;

  events.forEach(function(ev) {
    const diff = _.difference(_.keys(ev), VALID_KEYS);
    const eventName = ev.event;
    const callback = ev.callback;
    const product = Object.keys(manifestConfigs.product)[0];

    if (diff.length > 0) {
      errMsgs.push(`Invalid key in events array: '${diff}'`);
    }

    if (_.includes(eventsArr, eventName)) {
      errMsgs.push(`Event '${eventName}' is already mapped to a callback`);
    }

    if (!eventUtil.isValidEvent(product, eventName)) {
      errMsgs.push(`Invalid event: '${eventName}'`);
    }
    else {
      eventsArr.push(eventName);
    }
    if (!_.includes(evtHash.definedFunctions, callback)) {
      errMsgs.push(`Event callback '${callback}' is not defined.`);
    }
  });

  return errMsgs;
}

function isBackendApp() {
  return _.includes(manifestConfigs.features, 'backend');
}

module.exports = {
  validate() {
    try {
      let errMsgs = [];

      if (isBackendApp()) {
        const evtHash = eventUtil.getEventsList();

        errMsgs = validateEvents(evtHash);
      }
      return errMsgs;
    }
    catch (e) {
      debuglog(e);
      return [`Exception occured while validation: ${e.message}`];
    }
  },

  validationType: [validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION]
};
