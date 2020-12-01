'use strict';

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

module.exports = {
 get,
 set
};
