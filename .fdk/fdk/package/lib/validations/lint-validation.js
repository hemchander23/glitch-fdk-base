'use strict';

/* eslint-disable no-useless-escape */

const linter = require('eslint').linter;

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const validationConst = require('./constants').validationContants;
const customLintRules = require('./custom-lint-rules');
const lintUtil = require('../utils/lint-util');
const reportUtil = require('../utils/metric-util').report;

const ALLOWED_EXTNS = [ '.js' ];
const BACKEND_DIRS = [ './server' ];
const FRONTEND_DIRS = [ './app' ];
const SKIP_FOLDERS = [ 'node_modules' ];
const path = require('path');
const ECMA2015 = 2015, ECMA2018 = 2018;

linter.defineRules(customLintRules);

function constructLintMessage(filename, lint) {
  return {
    severity: lint.severity,
    value: `${filename}::${lint.line}: ${lint.message}`
  };
}

function getECMAVersion(filename) {
  /**
   *  App files shouldn't have async/await hence, ECMA2015, server files can go till ECMA2018
   */
  return filename.startsWith(`server${path.sep}`) ? ECMA2018 : ECMA2015;
}

function lint(files) {
  const lints = [];

  files.forEach(filename => {
    const fileContent = fileUtil.readFile(filename);

    const currentLints = linter.verify(fileContent, {
      rules: lintUtil.getRules(fileContent, filename),
      allowInlineConfig: true,
      parserOptions: {
        ecmaVersion: getECMAVersion(filename)
      }
    }, { filename }).map(lint => constructLintMessage(filename, lint));

    lints.push(...currentLints);
  });

  reportUtil.set('lints', lints);

  return lints;
}

module.exports = {
  validate() {
    let FILES = [];

    //Front end code for linting
    FRONTEND_DIRS.forEach(directory => {
      FILES = FILES.concat(fileUtil.spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory));
    });

    if (manifest.features.includes('backend')) {
      BACKEND_DIRS.forEach(directory => {
        FILES = FILES.concat(fileUtil.spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory));
      });
    }

    return lint(FILES);
  },
  validationType: [validationConst.PRE_PKG_VALIDATION]
};
