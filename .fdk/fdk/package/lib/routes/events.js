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

  try {
    const eventData = JSON.parse(fileUtil.readFile(`${process.cwd()}/server/test_data/${event}.json`));

    if (!eventData) {
      console.log(`Error while parsing ${event}.json`);
      res.json({});
    } else {
      res.json(eventData);
    }
  }
  catch (err) {
    console.log(`Error while parsing ${event}.json`);
    res.json({});
  }
}

function storeEventData(req, res) {
  const event = req.params.event;

  fileUtil.writeFile(`${process.cwd()}/server/test_data/${event}.json`, JSON.stringify(req.body, null, 2));
  res.send();
}

function resetEventData(req, res) {
  const event = req.params.event;
  const product = Object.keys(manifest.product)[0];
  const eventData = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/events/payloads/${product}/${event}.json`);

  fileUtil.writeFile(`${process.cwd()}/server/test_data/${event}.json`, JSON.stringify(eventData, null, 2));
  res.json(eventData);
}

function eventsPage(req, res) {
  if (manifest.features.includes('backend')) {
    return res.render('event-page.html');
  }

  return res.render('event-page-404.html');
}

function eventsList(req, res) {
  const product = Object.keys(manifest.product)[0];

  res.send({ events: eventUtil.eventsList(product) });
}

webEventsRouter.use('/web/assets', express.static(`${__dirname}/../web/assets`));
webEventsRouter.get('/web/events', eventsPage);
webEventsRouter.get('/web/eventsList', eventsList);
webEventsRouter.get('/web/events/:event', getEventData);
webEventsRouter.post('/web/events/:event', storeEventData);
webEventsRouter.post('/web/events/reset/:event', resetEventData);

module.exports = webEventsRouter;
