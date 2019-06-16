'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

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

describe('coverage test', () => {
  const coverageUtil = require('../lib/utils/coverage.js');
  let projDir;

  before(function() {
    projDir = tmp.dirSync({
      prefix: 'freshapps_sdk'
    });

    process.chdir(projDir.name);
    fs.writeFileSync(projDir.name + '/test.js', 'console.log(\'hello!\');');
  });

  // it('instruments the given file and prepends with wrapper', function () {
  //   var instrumentedCode = coverageUtil.instrument(projDir.name + '/test.js');

  //   expect(instrumentedCode).to.contain(wrapper);
  //   expect(instrumentedCode).to.contain('console.log(\'hello!\');')
  // });

  it('doesn\'t instruments the given file after snoozing', function () {
    coverageUtil.snooze();
    var instrumentedCode = coverageUtil.instrument(projDir.name + '/test.js');

    expect(instrumentedCode).not.to.contain(wrapper);
    expect(instrumentedCode).to.equal('console.log(\'hello!\');');
  });
});
