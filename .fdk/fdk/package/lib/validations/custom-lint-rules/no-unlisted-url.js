'use strict';

const manifest = require('../../manifest.js');
const path = require('path');

const url = require('url');
const validator = require('validator');

module.exports = {
  meta: {
    docs: {
      description: 'disallow URLs that are not whitelisted',
      category: 'Possible Errors',
      recommended: false
    }
  },

  create(context) {
    function isURL(string) {
      return validator.isFQDN(url.parse(string).hostname || '');
    }

    function isUnlisted(url) {
      return manifest
        .whitelistedDomains
      // eslint-disable-next-line no-useless-escape
        .every(listed => !(new RegExp(listed.replace('*', '[a-z0-9\-]*'))).test(url));
    }

    return {
      Literal(node) {
        // Only consider frontend JS files for whitelisting check
        if (!context.getFilename().startsWith(`app${path.sep}`)) {
          return;
        }

        if (typeof node.value !== 'string') {
          return;
        }

        if (!isURL(node.value)) {
          return;
        }

        if (isUnlisted(node.value)) {
          context.report({
            message: `"${node.value}" is not whitelisted in mainfest.`,
            node: node
          });
        }
      }
    };
  }
};