'use strict';

const path = require('path');

const scopeStack = [];

function enterScope() {
  scopeStack.push([]);
}

function exitScope() {
  scopeStack.pop();
}

module.exports = {
  meta: {
    docs: {
      description: 'disallow assignment across scopes',
      category: 'Possible Errors',
      recommended: false
    }
  },

  create(context) {
    // Only consider app JS files
    if (!context.getFilename().startsWith(`app${path.sep}`)) {
      return {};
    }

    return {
      'Program': enterScope,
      'Program:exit': exitScope,
      'FunctionDeclaration': enterScope,
      'FunctionDeclaration:exit': exitScope,
      'FunctionExpression': enterScope,
      'FunctionExpression:exit': exitScope,
      'ArrowFunctionExpression': enterScope,
      'ArrowFunctionExpression:exit': exitScope,

      'VariableDeclaration'(node) {
        node.declarations.forEach(declaration => {
          scopeStack[scopeStack.length - 1].push(declaration.id.name);
        });
      },

      'AssignmentExpression[left.type="Identifier"]'(node) {
        if (!scopeStack[scopeStack.length - 1].includes(node.left.name)) {
          context.report({
            message: `'${node.left.name}' declared and assigned in different scopes. Possible asynchronous race condition.`,
            node: node
          });
        }
      }
    };
  }
};
