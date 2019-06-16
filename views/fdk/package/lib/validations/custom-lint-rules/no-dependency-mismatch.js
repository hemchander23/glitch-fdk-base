'use strict';

const manifest = require('../../manifest.js');
const path = require('path');
const fs = require('../../utils/file-util.js');
const _ = require('lodash');

const SKIP_FOLDERS = [ 'node_modules' ];
const ALLOWED_EXTNS = [ '.js' ];
let serverFiles = fs.spider(SKIP_FOLDERS, ALLOWED_EXTNS, './server');

const dependenciesSeen = [];

module.exports = {
  meta: {
    docs: {
      description: 'disallow use of unlisted dependency',
      category: 'Possible Errors',
      recommended: false
    }
  },

  create(context) {
    const dependencyLoaders = context.options[0] || {};
    const fileName = context.getFilename();

    return {
      'Program:exit'(node) {
        // only consider backend JS files for deprecation check
        if (!fileName.startsWith(`server${path.sep}`)) {
          return;
        }

        serverFiles = _.without(serverFiles, fileName);

        if (serverFiles.length === 0) {
          const unusedDependencies = _.difference(Object.keys(manifest.dependencies),
            dependenciesSeen);

          if (unusedDependencies.length !== 0) {
            context.report({
              node,
              message: `The following dependencies are not used: ${unusedDependencies}`
            });
          }
        }
      },
      'CallExpression[callee.type="Identifier"]'(node) {
        // only consider backend JS files for deprecation check
        if (!fileName.startsWith(`server${path.sep}`)) {
          return;
        }

        if (!dependencyLoaders.includes(node.callee.name)) {
          return;
        }

        const dependency = node.arguments[0].value;

        // only consider dependency load and not file load
        if (!dependency || dependency.startsWith('.')) {
          return;
        }

        dependenciesSeen.push(dependency);

        if (manifest.dependencies.hasOwnProperty(dependency)) {
          return;
        }

        return context.report({
          message: `'${dependency}' is not listed in manifest.`,
          node: node
        });
      }
    };
  }
};
