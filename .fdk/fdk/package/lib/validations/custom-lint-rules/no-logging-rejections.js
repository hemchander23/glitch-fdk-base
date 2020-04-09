'use strict';

const astUtil = require('../../utils/syntax-util');

module.exports = {
  meta: {
    docs: {
      description: 'disallow logging promise rejections',
      category: 'Possible Errors',
      recommended: false
    }
  },

  create(context) {
    function isRedundantLogging(node) {
      if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') {
        return false;
      }

      // function(*) { console.*(*); })
      // * => { console.*(*); }
      if (node.body.type === 'BlockStatement' &&
          node.body.body.length === 1 &&
          astUtil.isMemberCallExpressionNode(node.body.body[0].expression) &&
          node.body.body[0].expression.callee.object.name === 'console') {
        return true;
      }

      // * => console.*(*)
      if (node.body.type === 'CallExpression' &&
          astUtil.isMemberCallExpressionNode(node.body)) {
        return true;
      }

      return false;
    }

    return {
      ExpressionStatement(node) {
        // Only consider frontend JS files for logging check
        const expression = node.expression;

        if (!astUtil.isPromiseHandler(expression)) {
          return;
        }

        // somePromise.then(*, *)
        if (astUtil.isThenCallExpression(expression) &&
            isRedundantLogging(expression.arguments[1])) {
          return context.report({
            node: expression.arguments[1],
            message: 'refrain from simply logging errors.'
          });
        }

        // somePromise.catch(*)
        // somePromise['catch'](*)
        if (astUtil.isCatchCallExpression(expression) &&
            isRedundantLogging(expression.arguments[0])) {
          return context.report({
            node: expression.arguments[0],
            message: 'refrain from simply logging errors.'
          });
        }
      }
    };
  }
};
