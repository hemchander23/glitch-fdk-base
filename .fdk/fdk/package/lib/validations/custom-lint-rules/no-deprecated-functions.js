'use strict';
module.exports = {
  meta: {
    docs: {
      description: 'disallow use of deprecated functions',
      category: 'Possible Errors',
      recommended: false
    },
    schema: {
      description: 'A representation of deprecated functions. key:value::deprecatedFunction:newFunction',
      type: 'array'
    }
  },

  create(context) {
    const deprecations = context.options[0] || {};

    return {
      'CallExpression[callee.type="Identifier"]'(node) {
        if (!deprecations.hasOwnProperty(node.callee.name)) {
          return;
        }

        context.report({
          message: `'${node.callee.name}' will soon be deprecated. Please use '${deprecations[node.callee.name]}'`,
          node: node
        });
      }
    };
  }
};
