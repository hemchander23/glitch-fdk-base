'use strict';

const manifest = require('../../manifest');
const fs = require('../../utils/file-util');
const _ = require('lodash');
const path = require('path');

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

        if (dependency.includes('/')) {
          const modulePath =dependency.split(path.sep);

          dependenciesSeen.push(modulePath[0]);
          if (manifest.dependencies.hasOwnProperty(modulePath[0])) {
            return;
          }
        }

        return context.report({
          message: `'${dependency}' is not listed in manifest.`,
          node: node
        });
      }
    };
  }
};
