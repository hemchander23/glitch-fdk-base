'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('./file-util');
const path = require('path');
const istanbul = require('istanbul');

const libInstrument = require('istanbul-lib-instrument');

const reportUtil = require('./metric-util').report;

/**
 *  The "wrapper" that is prefixed to the instrumented code. This is written generically
 *  so that both frontend and backend code get the same wrapper. Ensures that the global
 *  coverage object exists and, if in frontend, periodically sends the coverage object back
 *  to our local CLI server.
 */
const wrapper = `
  (function() {
    var global = Function('return this;')();

    if (!global.__fdkcoverage__) {
      global.__fdkcoverage__ = {};

      if (typeof fetch !== 'undefined') {
        var previous;

        setInterval(function() {
          var current = JSON.stringify(global.__fdkcoverage__);

          if (current === previous) {
            return;
          }

          fetch('http://localhost:10001/iframe/coverage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: current
          }).then(() => previous = current);
        }, 2000);
      }
    }
  })();
`;

var snoozing = false;

const EXPECTED_COVERAGE = 80;

/**
 *  Don't compactify the instrumented code so that the stack trace is
 *  still meaningful.
 */
// eslint-disable-next-line
const instrumenter = new libInstrument.createInstrumenter({
  coverageVariable: '__fdkcoverage__',
  compact: false
});

const HTMLReporter = new istanbul.Reporter();

HTMLReporter.add('html');

const collector = new istanbul.Collector();

collector.add(reportUtil.get('coverage') || {});

function isProperlyTested(coverageSummary) {
  if (!coverageSummary) {
    return false;
  }

  return Object
    .keys(coverageSummary)
    .every(key => coverageSummary[key].pct >= EXPECTED_COVERAGE);
}

/**
 *  Read and instrument the given code and prepend with wrapper (if not snoozing).
 */
function instrument(file) {
  const code = fs.readFile(file, 'utf8');

  if (snoozing) {
    debuglog(`Skipped instrumenting ${file}`);
    return code;
  }

  debuglog(`Instrumenting ${path.resolve(process.cwd(), file)}`);
  return wrapper + instrumenter.instrumentSync(code, path.relative(process.cwd(), file));
}

function dispose() {
  debuglog('Clearing coverage.');
  collector.dispose();
}

function flush(coverageStats) {
  debuglog('Flushing coverage.');
  collector.dispose();
  collector.add(coverageStats || {});
}

function update(coverageStats) {
  try {
    collector.add(coverageStats || {});
  }
  catch (e) {
    debuglog(`Error ${e.message} while merging coverage stats.`);
    flush(coverageStats);
  }

  if (process.env.NODE_ENV !== 'test') {
    debuglog('Writing coverage.');

    try {
      HTMLReporter.write(collector, true, () => { });
    }
    catch (e) {
      debuglog(`Error ${e.message} while writing coverage report.`);
      flush(coverageStats);
      HTMLReporter.write(collector, true, () => { });
    }
  }
}

function snooze() {
  debuglog('Snoozing coverage.');
  snoozing = true;
}

function shutdown() {
  const finalCoverage = collector.getFinalCoverage();
  const coverageSummary = istanbul.utils.summarizeCoverage(finalCoverage);

  delete coverageSummary.linesCovered;

  reportUtil.set('coverage', finalCoverage);
  reportUtil.set('coverageSummary', coverageSummary);

  if (collector.files().length) {
    const TXTReporter = new istanbul.Reporter();

    TXTReporter.add('text-summary');

    if (!isProperlyTested(coverageSummary)) {
      console.log('\nNOTE: We recommend a coverage of 80% for apps that are to be published in the public marketplace.');
    }

    console.log(`\nPlease find the detailed coverage report at ${process.cwd()}/coverage/index.html`);
    TXTReporter.write(collector, true, () => { });
  }

  process.exit();
}

/**
 *  Don't bother generating coverage reports in test environments as this will
 *  conflict with the actual coverage report generated by the test framework.
 */
if (process.env.NODE_ENV !== 'test') {
  process.once('SIGINT', shutdown);
}

module.exports = {
  instrument,
  update,
  dispose,
  snooze,
  shutdown
};
