#!/usr/bin/env node

'use strict';

require('./lib/utils/debugger-util');

global.FDK_PATH = __dirname;

const debuglog = __debug.bind(null, __filename);

const errorHandler = require('./lib/utils/error-util');
const fileUtil = require('./lib/utils/file-util');
const help = require('./lib/cli/help');
const pjson = require('./package.json');
const updater = require('./lib/updater');
const writeMetric = require('./lib/utils/metric-util');
const suggest = require('./lib/utils/command-util').suggestCommand;

global.PLATFORM_SOURCE = 'PLATFORM';
global.APP_SOURCE = 'APP';
global.pjson = pjson;

const validationConst = require('./lib/validations/constants').validationContants;
// Cli Parsing:
const NODE_MAJOR = 10;

if (Number(process.versions.node.split('.')[0]) < NODE_MAJOR) {
  console.log('Node version of 10.x.x and above is required to run SDK. ' + process.versions.node + ' found.');
  process.exit(0);
}
// 1. Registering Cli commands
const Program = require('wiz-cliparse');
const prg = new Program('fdk',
  'Freshworks Development Kit.',
  '[global-options] [command] [command-options] [arguments]',
  'The Freshworks Development Kit enables you to build, test and package apps for publishing on the Marketplace.');

prg.addOpt('h', 'help', 'Lists the commands for fdk');
prg.addOpt('v', 'version', 'Displays the installed and latest version of fdk');

prg.addCmd('help',
  '# Display help for fdk');

const cmdInit = prg.addCmd('create',
  '# Create a new app',
  '[folder]',
  'When [folder] is not given, CWD (if empty) is used to init.');

cmdInit.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdInit.addOpt('p', 'products', 'Products', {
  hasArg: true
});
cmdInit.addOpt('t', 'template', 'Template to base the project on.', {
  hasArg: true
});
cmdInit.addOpt('h', 'help', 'create command help.');

const cmdGenerate = prg.addCmd('generate', '# Generates configuration files for the app');

cmdGenerate.addOpt('h', 'help', 'create command help.');

const cmdRun = prg.addCmd('run', '# Run the app on a local server for testing');

cmdRun.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdRun.addOpt('a', 'tunnel-auth', 'Auth token for tunnel with ngrok', {
  hasArg: true
});
cmdRun.addOpt('c', 'clear-coverage', 'clear code-coverage stats');
cmdRun.addOpt('s', 'skip-coverage', 'skip instrumenting code');
cmdRun.addOpt('h', 'help', 'run command help.');
cmdRun.addOpt('t', 'tunnel', 'Enable tunnel with ngrok');
cmdRun.addOpt('v', 'skip-validation', 'Skip specific validations.', {
  hasArg: true
});

const cmdValidate = prg.addCmd('validate', '# Run validation tests on the app');

cmdValidate.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdValidate.addOpt('v', 'skip-validation', 'Skip specific validations.', {
  hasArg: true
});
cmdValidate.addOpt('h', 'help', 'run command help.');
cmdValidate.addOpt('f', 'fix', 'automatically fix validation warnings and errors');
const cmdPack = prg.addCmd('pack', '# Package the app into a zip file');

cmdPack.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdPack.addOpt('h', 'help', 'run command help.');
cmdPack.addOpt('v', 'skip-validation', 'Skip specific validations.', {
  hasArg: true
});

const cmdVersion = prg.addCmd('version', '# Display installed and latest version');

cmdVersion.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdVersion.addOpt('h', 'help', 'run command help.');

const cmdTest = prg.addCmd('test', '# Run tests defined for the current app');

cmdTest.addOpt('c', 'clear-coverage', 'clear code-coverage stats');
cmdTest.addOpt('s', 'skip-coverage', 'skip instrumenting code');
cmdTest.addOpt('d', 'app-dir', 'App directory.', {
  hasArg: true
});
cmdTest.addOpt('h', 'help', 'run command help.');


// 2. Parse cli options:
let res = null;

try {
  res = prg.parse();
}
catch (err) {
  if (err.startsWith('Unrecognized global option')) {
    const opt = err.match(/Unrecognized global option: (.*)./)[1];

    console.error(`fdk: '${opt}' is not a valid option. Please type 'fdk --help' to get the list of supported commands.`);
    help.printProductDocUrls();
  }
  if (err.startsWith('Unrecognized command')) {
    const cmd = err.match(/Unrecognized command: (.*)./)[1];

    console.error(`fdk: '${cmd}' is not a valid command. See 'fdk --help'`);

    if (suggest(cmd)) {
      console.log(`\nDo you mean: \x1b[35mfdk ${suggest(`${cmd}`)} \x1b[0m`);
    }

    help.printProductDocUrls();
  }
  else {
    console.error(err);
  }
  process.exit(1);
}

debuglog(`Running with args ${JSON.stringify(res)}`);

writeMetric.store('command', {'timestamp': `${Date.now()}`, 'command' : `${res.cmd}`, 'arguments': `${JSON.stringify([...res.opts])}`});

function showHelp(command) {
  if (res.opts.has('h')) {
    help.printHelp(command);
    process.exit(0);
  }
}

if (res.opts.has('app-dir')) {
  const directory = res.optArg.get('app-dir');

  debuglog(`Looking for app-dir "${directory}"`);

  if (fileUtil.fileExists(directory)) {
    process.chdir(directory);
  }
  else {
    console.log('The specified path to the directory is not valid.');
    process.exit(1);
  }
}

function runCLI(error) {
  if (error) {
    console.log(error);
    process.exit(1);
  }

  //Global Options
  function checkForVersion(options) {
    if (options.has('v')) {
      require('./lib/cli/version').run();
    }
    //defaultOutput(options);
  }
  //// TODO: Have a default output
  // function defaultOutput(options){
  //   console.log('This will have default output----for example purpose');
  // }

  function checkForHelp(options) {
    if (options.has('h')) {
      console.log(`Installed fdk version: ${pjson.version}`);
      prg.printHelp(res);
      help.printProductDocUrls();
      process.exit(0);
    }
    checkForVersion(options);
  }

  function checkForGlobalHelp(response) {
    if (res.gopts.size ===0 && res.cmd===null) {
      console.log(`Installed fdk version: ${pjson.version}`);
      prg.printHelp(res);
      help.printProductDocUrls();
      process.exit(0);
    }
    checkForHelp(response.gopts);
  }

  function executeUserOptions(response) {
    checkForGlobalHelp(response);
  }

  executeUserOptions(res);

  // Other commands:
  switch (res.cmd) {
    case 'create': {
      showHelp('create');
      const template = res.optArg.get('t');
      const product = res.optArg.get('p');

      require('./lib/cli/init').run(process.cwd(), template, product);
      break;
    }

    case 'run': {
      showHelp('run');
      require('./lib/cli/run').run(res.opts.has('c'), res.opts.has('s'), res.optArg.get('v'), res.opts.has('t'), res.opts.has('a') ? res.optArg.get('a') : null);
      break;
    }

    case 'validate': {
      showHelp('validate');
      const validationMessages = require('./lib/cli/validate').run(
        validationConst.PRE_PKG_VALIDATION, res.optArg.get('v'), res.opts.has('fix'));

      errorHandler.printError('Validation failed due to the following issue(s):', validationMessages);
      console.log('Validation Successful');
      break;
    }

    case 'pack': {
      showHelp('pack');
      require('./lib/cli/pack').run(res.optArg.get('v'));
      break;
    }

    case 'version': {
      showHelp('version');
      require('./lib/cli/version').run();
      break;
    }

    case 'generate': {
      showHelp('generate');
      require('./lib/cli/generate').run();
      break;
    }

  case 'test': {
    showHelp('test');
    require('./lib/cli/test').run(res.opts.has('c'), res.opts.has('s'));
    break;
  }

  case 'help': {
    prg.printHelp(res);
    console.log(`Installed: ${pjson.version}`);
    break;
  }
  }
}

updater.checkForUpdate(runCLI);
