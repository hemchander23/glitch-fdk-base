'use strict';

[
  'no-unhandled-promise',
  'no-logging-rejections',
  'no-dependency-mismatch',
  'no-deprecated-functions',
  'no-cross-scope-assign',
  'no-non-client-request-model'
].forEach(rule => module.exports[rule] = require(`./${rule}.js`));
