'use strict';
const debuglog = __debug.bind(null, __filename);
const path = require('path');
const WARN = 1,
  ERROR = 2;
const MAX_COMPLEXITY = 7,
  MAX_NESTING = 4;
//Lint rules that apply for all files.
const commonRules = {
  'no-caller': WARN,
  'no-process-env': WARN,
  'complexity': [WARN, MAX_COMPLEXITY],
  'max-nested-callbacks': [WARN, MAX_NESTING],
  'handle-callback-err': [WARN, '^.*(e|E)rr'],
  'no-eval': ERROR,
  'no-alert': ERROR,
  'no-debugger': ERROR,
  'no-unreachable': ERROR,
  // These are custom lint rules. Please refer to the custom-lint-rules directory
  'no-unhandled-promise': WARN,
  'no-logging-rejections': WARN,
  'no-non-client-request-model': WARN
};
const appRules = {
  'no-cross-scope-assign': WARN
};
const serverRules = {
  'no-dependency-mismatch': [ERROR, ['require']]
};
//Lint rules that apply for files that are not minified.
const nonMinifiedRules = {
  'no-empty-function': ERROR,
  'no-unused-vars': [ERROR, { vars: 'local' }]
};

function isMinified(fileContent) {
  const nooflines = (fileContent.split('\n')).length;
  const INDENT_COUNT_THRESHOLD = 20;
  let lineEndIndex = 0;
  let lineStartIndex = 0;
  let lines = 1;
  let indentCount = 0;
  const percent = 100;

  fileContent = fileContent.replace(/\/\*[\S\s]*?\*\/|\/\/(.+|\n)/g, '');
  while (lines < nooflines) {
    lineEndIndex = fileContent.indexOf('\n', lineStartIndex);
    if (lineEndIndex === -1) {
      break;
    }
    if (/^\s+/.test(fileContent.slice(lineStartIndex, lineEndIndex))) {
      indentCount = indentCount + 1;
    }
    lineStartIndex = lineEndIndex + 1;
    lines = lines + 1;
  }
  return ((indentCount / lines) * percent) < INDENT_COUNT_THRESHOLD;
}

module.exports = {
  getRules(fileContent, filename) {
    const isAppFile = filename.startsWith(`app${path.sep}`);
    const rules = { ...commonRules };

    Object.assign(rules, isAppFile ? appRules : serverRules);
    if (!isMinified(fileContent)) {
      Object.assign(rules, nonMinifiedRules);
    }
    debuglog(`Running the following lints on the file ${filename} : ${Object.keys(rules)}`);
    return rules;
  }
};
