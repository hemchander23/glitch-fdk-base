'use strict';

/* eslint-disable no-useless-escape */

const Linter = require('eslint').Linter;
const linter = new Linter();

const fileUtil = require('../utils/file-util');
const manifest = require('../manifest');
const validationConst = require('./constants').validationContants;
const customLintRules = require('./custom-lint-rules');
const lintUtil = require('../utils/lint-util');
const reportUtil = require('../utils/report-util');

const ALLOWED_EXTNS = [ '.js' ];
const BACKEND_DIRS = [ './server' ];
const FRONTEND_DIRS = [ './app' ];
const SKIP_FOLDERS = [ 'node_modules' ];
const path = require('path');
const ECMA2015 = 2015, ECMA2018 = 2018;

linter.defineRules(customLintRules);
const fs = require('fs');
const debuglog = __debug.bind(null, __filename);

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

function lint(files, fix) {
  const lints = [];
  //let fixedLintsCounter = 0;
  let lintMessages = [];
  //let validatorMessage = '';

  const toCall = fix ? 'verifyAndFix' : 'verify';

  files.forEach(filename => {
    const fileContent = fileUtil.readFile(filename);

    const currentLints = linter[toCall](fileContent, {
      rules: lintUtil.getRules(fileContent, filename),
      allowInlineConfig: true,
      parserOptions: {
        ecmaVersion: getECMAVersion(filename)
      }
    }, { filename });

    if (fix) {
      fs.writeFileSync(filename, currentLints.output, function (err) {
        if (err) { debuglog('There is an error rewriting file with corrected code'); }
      });
    //if(currentLints.fixed == true) fixedLintsCounter++;  Skip counting for now
    }
    lintMessages = fix ? currentLints.messages : currentLints;
    lints.push(...lintMessages.map(lint => constructLintMessage(filename, lint)));
  });

  reportUtil.set('lints', lints);

  return lints;
}

module.exports = {
  name: 'lint',

  validate(appType, fix) {
    let FILES = [];

    debuglog(`passed fix flag: ${fix}`);
    //Front end code for linting
    FRONTEND_DIRS.forEach(directory => {
      FILES = FILES.concat(fileUtil.spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory));
    });

    if (manifest.features.includes('backend')) {
      BACKEND_DIRS.forEach(directory => {
        FILES = FILES.concat(fileUtil.spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory));
      });
    }

    return lint(FILES, fix);
  },

  validationType: [ validationConst.PRE_PKG_VALIDATION ]
};
