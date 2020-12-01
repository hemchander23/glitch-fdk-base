'use strict';

const DataStore = require('../utils/data-util').DataStore;
const eventUtil = require('../utils/event-util');
const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');

const os = require('os');

const dbApi = new DataStore({
  location: `${os.homedir()}/.fdk/`
});

const express = require('express');
const webEventsRouter = new express.Router();

const addonVersion = dbApi.fetch('version_details').addon.version;

function getEventData(req, res) {
  const event = req.params.event;
  let product = req.query.product;

  try {
    let filePath = null;

    if (product) {
      filePath = `${process.cwd()}/server/test_data/${product}/${event}.json`;
    }
    else {
      filePath = `${process.cwd()}/server/test_data/${event}.json`;
    }
    let eventData = JSON.parse(fileUtil.readFile(filePath));

    if (!eventData) {
      console.log(`\x1b[33m[WARN]\x1b[0m ${event}.json does not exist. File will be generated after simulation`);
      if (!product) {
        product = Object.keys(manifest.product)[0];
      }
      eventData = JSON.parse(fileUtil.readFile(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/payloads/${product}/${event}.json`));
    }
    res.json(eventData);
  }
  catch (err) {
    console.log(err.message);
    console.log(`Error while parsing ${event}.json`);
    res.json({});
  }
}

function storeEventData(req, res) {
  const event = req.params.event;
  const product = req.query.product;

  let pathToWrite = `${process.cwd()}/server/test_data/${event}.json`;

  if (product) {
    pathToWrite = `${process.cwd()}/server/test_data/${product}/${event}.json`;
  }
  fileUtil.writeFile(pathToWrite, JSON.stringify(req.body, null, 2));
  res.send();
}

function resetEventData(req, res) {
  const event = req.params.event;
  const product = req.query.product || Object.keys(manifest.product)[0];
  const eventData = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/payloads/${product}/${event}.json`);

  fileUtil.writeFile(`${process.cwd()}/server/test_data/${event}.json`, JSON.stringify(eventData, null, 2));
  res.json(eventData);
}

function eventsList(req, res) {
  const product = req.query.product || Object.keys(manifest.product)[0];

  res.send({ events: eventUtil.eventsList(product) });
}

webEventsRouter.get('/web/eventsList', eventsList);
webEventsRouter.get('/web/events/:event', getEventData);
webEventsRouter.post('/web/events/:event', storeEventData);
webEventsRouter.post('/web/events/reset/:event', resetEventData);


module.exports = webEventsRouter;
