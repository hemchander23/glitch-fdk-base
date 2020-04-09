'use strict';

const fs = require('fs');

const debuglog = __debug.bind(null, __filename);

const DataStore = require('./data-util').DataStore;
const fileUtil = require('./file-util');

const reportJSON = fileUtil.safeRequire(`${process.cwd()}/.report.json`);

process.on('exit', function() {
  fileUtil.writeFile('.report.json', JSON.stringify(reportJSON));
});

function get(key) {
  return key === undefined ? reportJSON : reportJSON[key];
}

function set(key, value) {
  reportJSON[key] = value;
}

const storage = new DataStore({
  file: 'metrics'
});

function getMetricFileLocation() {
  return `${process.cwd()}/.fdk/metrics`;
}

function readMetricFile() {
  //Reading metrics from localstore metrics file
  let metricData = {};

  if (fileUtil.fileExists(getMetricFileLocation())) {
    metricData = storage.readLocalStore();
  }
  return metricData;
}
function store(key, value){
  debuglog(`Metric: version ${key}, ${value}`);
  var previous_data = storage.fetch(key);

  if (key !== undefined) {
    if (previous_data === undefined) {
      previous_data = [];
    }
    previous_data.push(value);
    //Store value as array of metric data:-> Key: Related data (e.g. : {version: [version info]})
    storage.store(key, previous_data);
  }
}

function fetch(key) {
  return storage.fetch(key);
}

function addMetrics(callback){
  var filePath = `${process.cwd()}/.report.json`;

  debuglog(`writing metrics to  ${filePath}`);
  var metricData = readMetricFile();

  //storing it in .report.json
  set('metricData', metricData);
  //as reportutil was writing after exit of process but we need before app exits
  fs.writeFile(filePath, JSON.stringify(get(undefined)), callback);
}

function removeMetrics() {

  fileUtil.deleteFile(getMetricFileLocation());
  set('metricData', {});

}

module.exports = {
 store,
 fetch,
 addMetrics,
 removeMetrics,
 report:{
   get,
   set
 }
};
