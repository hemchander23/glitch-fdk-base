'use strict';
const astUtil = require('../../utils/syntax-util');

function sendReportMessage(node, context) {
  const message = 'Use client.request when making API requests';

  return context.report({
      message,
      node
  });
}

function reportNonClientRequest(node, context) {
    if (!astUtil.isNonClientRequest(node)) {
        return;
    }
    return sendReportMessage(node, context);
}

module.exports = {
  meta: {
    docs: {
      description: 'Disallow REST api calls via non client.request fashion',
      category: 'Possible Errors',
      recommended: false
    }
  },
  create(context) {
    if (context.getFilename().startsWith('server')) {
      return {};
    }
    return {
      NewExpression(node) {
        reportNonClientRequest(node, context);
      },
      MemberExpression(node) {
        reportNonClientRequest(node, context);
      },
      CallExpression(node) {
        reportNonClientRequest(node, context);
      }
    };
  }
};
