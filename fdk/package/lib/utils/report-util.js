'use strict';

const fs = require('./file-util.js');

const reportJSON = fs.safeRequire(`${process.cwd()}/.report.json`);

process.on('exit', function() {
  fs.writeFile('.report.json', JSON.stringify(reportJSON));
});

module.exports = {
  get(key) {
    return key === undefined ? reportJSON : reportJSON[key];
  },
  set(key, value) {
    reportJSON[key] = value;
  }
};
