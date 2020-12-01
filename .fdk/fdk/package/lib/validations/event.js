'use strict';

const eventUtil = require('../utils/event-util');
const manifestConfigs = require('../manifest');
const validationConst = require('./constants').validationContants;

const debuglog = __debug.bind(null, __filename);
const VALID_KEYS = ['event', 'callback'];

function doValidate(events, evtHash, product) {
  const errMsgs = [];
  const eventsArr = [];

  events.forEach(function (ev) {
    const diff = Object.keys(ev)
      .filter(key => !VALID_KEYS.includes(key))
      .concat(VALID_KEYS.filter(key => !Object.keys(ev).includes(key)));
    const eventName = ev.event;
    const callback = ev.callback;

    if (diff.length > 0) {
      errMsgs.push(`Invalid key in events array: '${diff}' for product: ${product}`);
    }

    if (eventsArr.includes(eventName)) {
      errMsgs.push(`Event '${eventName}' is already mapped to a callback for product: ${product}`);
    }

    if (!eventUtil.isValidEvent(product, eventName)) {
      errMsgs.push(`Invalid event: '${eventName}' for product: ${product}`);
    }
    else {
      eventsArr.push(eventName);
    }
    if (!evtHash.definedFunctions.includes(callback)) {
      errMsgs.push(`Event callback '${callback}' is not defined for product: ${product}.`);
    }
  });

  return errMsgs;
}

function validateEvents(evtHash) {
  let errMsgs = [];
  const events = evtHash.events;

  if (!events) {
    return errMsgs;
  }
  try {
    if (!(Array.isArray(events))) {
      const products = Object.keys(events);

      products.forEach((product) => {
        if (!manifestConfigs.product[product]) {
          errMsgs.push(`Invalid product '${product}' configured for events`);
        }
        errMsgs = errMsgs.concat(doValidate(events[product], evtHash, product));
      });
    }
    else {
      const products = Object.keys(manifestConfigs.product);

      if (products) {
        products.forEach((product) => {
          errMsgs = errMsgs.concat(doValidate(events, evtHash, product));
        });
      }
    }
  } catch (err) {
    debuglog(`Event validation failed due to misconfiguration: ${err.message}`);
    errMsgs = [];
    errMsgs.push('Invalid event configuration in server.js');
  }
  return errMsgs;
}

function isBackendApp() {
  return manifestConfigs.features.includes('backend');
}

module.exports = {
  name: 'event',

  validate() {
    try {
      let errMsgs = [];
      let evtHash = {};

      if (isBackendApp()) {
        evtHash = eventUtil.getEventsList();
        errMsgs = validateEvents(evtHash);
      }
      return errMsgs;
    }
    catch (e) {
      debuglog(e);
      return [`Exception occured while validation: ${e.message}`];
    }
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION, validationConst.RUN_VALIDATION ]
};
