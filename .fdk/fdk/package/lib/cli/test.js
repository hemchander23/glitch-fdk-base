'use strict';

/**
 * TODO
 *
 * Use lambda layers
 * Remove jquery-deferred
 * standardise backend features and remove all unnecssary inheritance
 * expose more mocha options like timeout and retry
 */
const debuglog = __debug.bind(null, __filename);

const path = require('path');

const Mocha = require('mocha'),
      sinon = require('sinon');

const manifest = require('../manifest.js'),
      fileUtil = require('../utils/file-util.js'),
      coverageUtil = require('../utils/coverage-util.js'),
      dependencyInstaller = require('../utils/install-util.js'),
      eventUtil = require('../utils/event-util');

const eventHandler = require('../event_handler/framework.js');

const serverlessAPIs = {
  $db: require('../event_handler/features/db.js'),
  $request: require('../event_handler/features/request.js'),
  $schedule: require('../event_handler/features/schedule.js'),
  $hook: require('../event_handler/features/hook.js')
};

const ONE_SEC_MSEC = 1000;

const util = require('util');

/**
 * these polyfills are needed given our backend code uses jQuery deferred which have `done` and `fail` interfaces
 * the promise returned by sinon is standard e6 promise. hence we have to monkey-patch promises.
 * this can be removed once we move away from jquery deferred
 */
Object.assign(Promise.prototype, {
  done: util.deprecate(Promise.prototype.then, '`Promise.done` will soon be deprecated, please use `Promise.then`'),
  fail: util.deprecate(Promise.prototype.catch, '`Promise.fail` will soon be deprecated, please use `Promise.catch`')
});

function getCategoryNameforEvent(event, product) {
  if ([ 'onAppInstall', 'onAppUninstall' ].includes(event)) {
    return 'appEvent';
  }

  if (eventUtil.isValidEvent(product, event)) {
    return 'productEvent';
  }

  return 'request';
}

function invoke(event, payload, reqProduct) {
  const product = reqProduct || Object.keys(manifest.product)[0];
  const request = {
    meta:{
      product: product
    },
    body: {
      categoryName: getCategoryNameforEvent(event, product),
      categoryArgs: {
        methodName: event,
        methodParams: payload
      }
    },
    timeout: 5000
  };

  if (eventUtil.manifestEvents){
    request.meta.events = eventUtil.manifestEvents.events[product];
  }

  debuglog(`invoking ${event} with "${JSON.stringify(request)}"`);

  return new Promise((resolve, reject) => {
    if (request.body.categoryName === 'productEvent') {
      setTimeout(resolve, 0);
    }

    try {
      eventHandler(request, {
        header() {},
        status() {
          return {
            json(response) {
              if (response.hasOwnProperty('errorSource')) {
                return reject(response);
              }

              return resolve(response);
            }
          };
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function stub(api, property) {
  if (api === 'generateTargetUrl') {
    api = '$hook';
    property = 'generateTargetUrl';
  }

  if (!serverlessAPIs.hasOwnProperty(api)) {
    throw new Error(`Cannot stub unknown API "${api}"`);
  }

  return sinon.stub(serverlessAPIs[api].prototype, property);
}

module.exports = {
  run: async (clearCoverage, skipCoverage) => {
    if (!manifest.features.includes('backend')) {
      debuglog(`Not a backend app looking in "${manifest.features.toString()}".`);
      console.log('This is not a backend app. Exiting....');
      return;
    }

    if (clearCoverage) {
      debuglog('Clearing Coverage.');
      coverageUtil.dispose();
    }

    if (skipCoverage) {
      debuglog('Skipping Coverage.');
      coverageUtil.snooze();
    }

    await dependencyInstaller.run(manifest.dependencies);
    await dependencyInstaller.run(manifest.devDependencies, 'test');

    const mochaRunner = new Mocha({
      ui: 'bdd',
      reporter: 'spec',
      timeout: 5000
    });

    Object.assign(mochaRunner.suite.ctx, {
      invoke,
      stub
    });

    const testPath = path.join(process.cwd(), './test');

    if (!fileUtil.fileExists(testPath)) {
      console.log('Please add tests under the "test/" folder in your app\'s root.');
      console.log('For more information, visit https://developers.freshworks.com/docs/tests');
      process.exit();
    }

    const testFiles = fileUtil.spider([ 'node_modules' ], [ '.js' ], testPath);

    debuglog(`About to run the following test files "${testFiles}"`);

    testFiles.forEach(file => mochaRunner.addFile(file));

    mochaRunner
      .run(failureCount => {
        // Wait for the coverage to be collected before exiting
        setTimeout(() => {
          coverageUtil.shutdown();
          process.exit(failureCount > 0 ? -1 : 0);
        }, ONE_SEC_MSEC);
      });
  }
};
