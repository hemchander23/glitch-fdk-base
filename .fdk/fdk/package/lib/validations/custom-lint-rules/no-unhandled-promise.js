'use strict';

// Based on https://github.com/xjamundx/eslint-plugin-promise/blob/master/rules/catch-or-return.js

const astUtil = require('../../utils/syntax-util');

module.exports = {
  meta: {
    docs: {
      description: 'disallow unhandled promise',
      category: 'Possible Errors',
      recommended: false
    }
  },
  create(context) {
    return {
      ExpressionStatement(node) {
        const expression = node.expression;

        if (!astUtil.isPromise(expression)) {
          return;
        }

        // somePromise.then(*, *)
        if (astUtil.isThenCallExpression(expression)) {
          return;
        }

        // somePromise.catch(*)
        // somePromise['catch'](*)
        if (astUtil.isCatchCallExpression(expression)) {
          return;
        }

        return context.report({
          node,
          message: 'Expected rejection to be handled.'
        });
      }
    };
  }
};
