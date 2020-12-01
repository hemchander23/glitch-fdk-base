'use strict';

const debuglog = __debug.bind(null, __filename);

const os = require('os');
const esprima = require('esprima');
const fs = require('fs');
const manifest = require('../manifest');

const ARR_EXP = 'ArrayExpression';

const DataStore = require('./data-util').DataStore;

const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});
const addonVersion = dbApi.fetch('version_details').addon.version;

const events = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/eventsNew.json`);

function getDefinedFunctions(hash) {
  const definedFunc = [];

  hash.forEach((prop) => {
    if (prop.value.type === 'FunctionExpression') {
      definedFunc.push(prop.key.name);
    }
  });

  debuglog(`Found ${JSON.stringify(definedFunc)} as exported functions.`);

  return definedFunc;
}

function buildEventsHash(property) {
  const events = [];
  const eventsHash = property ? property.value.elements : [];

  eventsHash.forEach((evt) => {
    const values = evt.properties;
    const hash = {};

    values.forEach((p) => {
      hash[p.key.name] = p.value.value;
    });
    events.push(hash);
  });

  return events;
}

function parseServerFile() {
  const code = fs.readFileSync(`${process.cwd()}/server/server.js`, 'utf8');
  const ast = esprima.parse(code).body;

  return ast.find((node) => {
    return (node.type === 'ExpressionStatement'
      && node.expression.type === 'AssignmentExpression'
      && node.expression.left.name === 'exports');
  });
}

function getServerJSEvents() {
  let events = null;
  const exportsExp = parseServerFile();

  let definedFunc = [];

  if (exportsExp) {
    const properties = exportsExp.expression.right.properties;

    definedFunc = getDefinedFunctions(properties);
    const eventProp = properties.find((prop) => {
      return (prop.key.name === 'events'
        && (prop.value.type === ARR_EXP));
    });

    if (eventProp) {
      events = buildEventsHash(eventProp);
      debuglog(`Found ${JSON.stringify(events)} as events.`);
    }
  }
  return {
    events: events,
    definedFunctions: definedFunc
  };
}

function eventsList(product) {
  return events[product].map(event => event.name);
}

function isValidEvent(product, eventName) {
  return eventsList(product).includes(eventName);
}

function getCRCResponse(method, headers, query) {
  const externalService = query.crc_strategy;

  debuglog(`Sending CRC response for service - ${externalService || 'default'}`);

  switch (externalService) {
    case 'facebook':
      return {
        status: 200,
        body: query['hub.challenge']
      };
    default:
      return {
        status: 200,
        body: {}
      };
  }
}

function getManifestEvents() {
  const exportsExp = parseServerFile();
  const products = manifest.product;
  const manifestProducts = Object.keys(products);
  const events = {};
  let definedFunctions = null;

  if (exportsExp) {
    const properties = exportsExp.expression.right.properties;

    definedFunctions = getDefinedFunctions(properties);
  }

  manifestProducts.forEach((product) => {
    if (!products[product].events) {
      return;
    }
    events[product] = {};
    const evnts = Object.keys(products[product].events);

    events[product] = evnts.map(evnt => {
      return {
        event: evnt,
        callback: products[product].events[evnt].handler
      };
    });
  });

  module.exports.manifestEvents = { events, definedFunctions };

  return { events, definedFunctions };
}

function getEventsList() {
  switch (manifest.pfVersion) {
    case '2.0': {
      return getServerJSEvents();
    }
    default: {
      return getManifestEvents();
    }
  }
}

module.exports = {
  eventsList,
  isValidEvent,
  getEventsList,
  getCRCResponse
};
