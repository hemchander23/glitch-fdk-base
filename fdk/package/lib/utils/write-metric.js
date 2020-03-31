'use strict';

const fs = require('fs');

const debuglog = __debug.bind(null, __filename);

const DataStore = require('./data-store');
const reportUtil = require('./report-util');
const fileUtil = require('./file-util');

const store = new DataStore({
  file: 'metrics'
});

function getMetricFileLocation() {
  return `${process.cwd()}/.fdk/metrics`;
}

function readMetricFile() {
  //Reading metrics from localstore metrics file
  let metricData = {};

  if (fileUtil.fileExists(getMetricFileLocation())) {
    metricData = store.readLocalStore();
  }
  return metricData;
}

module.exports = {
  store(key, value){
    debuglog(`Metric: version ${key}, ${value}`);
    var previous_data = store.fetch(key);

    if (key !== undefined) {
      if (previous_data === undefined) {
        previous_data = [];
      }
      previous_data.push(value);
      //Store value as array of metric data:-> Key: Related data (e.g. : {version: [version info]})
      store.store(key, previous_data);
    }
  },

  fetch(key) {
    return store.fetch(key);
  },

  addMetrics(callback){
    var filePath = `${process.cwd()}/.report.json`;

    debuglog(`writing metrics to  ${filePath}`);
    var metricData = readMetricFile();

    //storing it in .report.json
    reportUtil.set('metricData', metricData);
    //as reportutil was writing after exit of process but we need before app exits
    fs.writeFile(filePath, JSON.stringify(reportUtil.get(undefined)), callback);
  },

  removeMetrics() {

    fileUtil.deleteFile(getMetricFileLocation());
    reportUtil.set('metricData', {});

  }
};
