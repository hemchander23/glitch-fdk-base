'use strict';

/* eslint-disable no-useless-escape */

const linter = require('eslint').linter;

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const validationConst = require('./constants').validationContants;
const customLintRules = require('./custom-lint-rules');

const reportUtil = require('../utils/report-util.js');

const ALLOWED_EXTNS = [ '.js' ];
const BACKEND_DIRS = [ './server' ];
const FRONTEND_DIRS = [ './app' ];
const SKIP_FOLDERS = [ 'node_modules' ];
const path = require('path');
const ECMA2015 = 2015, ECMA2017 = 2017;

const WARN = 1,
  ERROR = 2;

const MAX_COMPLEXITY = 7,
  MAX_NESTING = 4;

const rules = {
  'no-caller': WARN,
  'no-process-env': WARN,
  'complexity': [ WARN, MAX_COMPLEXITY ],
  'max-nested-callbacks': [ WARN, MAX_NESTING ],
  'handle-callback-err': [ WARN, '^.*(e|E)rr' ],

  'no-eval': ERROR,
  'no-alert': ERROR,
  'no-debugger': ERROR,
  'no-unreachable': ERROR,
  'no-empty-function': ERROR,
  'no-unused-vars': [ ERROR, { vars: 'local' } ],

  // These are custom lint rules. Please refer to the custom-lint-rules directory
  'no-unhandled-promise': WARN,
  'no-logging-rejections': WARN,
  'no-cross-scope-assign': WARN,

  'no-dependency-mismatch': [ ERROR, [ 'require', 'loadDependency' ] ],
  'no-deprecated-functions': [ ERROR, {
    loadLib: 'require',
    loadDependency: 'require'
  }]
};

linter.defineRules(customLintRules);

function constructLintMessage(filename, lint) {
  return {
    severity: lint.severity,
    value: `${filename}::${lint.line}: ${lint.message}`
  };
}

function getECMAVersion(filename) {
  /**
   *  App files shouldn't have async/await hence, ECMA2015, server files can go till ECMA2017
   */
  return filename.startsWith(`server${path.sep}`) ? ECMA2017 : ECMA2015;
}

function lint(files) {
  const lints = [];

  files.forEach(filename => {
    const fileContent = fileUtil.readFile(filename);

    const currentLints = linter.verify(fileContent, {
      rules: rules,
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
