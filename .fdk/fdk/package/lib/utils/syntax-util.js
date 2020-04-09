'use strict';

const PROMISE_METHODS = [ 'then', 'catch', 'done', 'fail' ];
const PROMISE_REJECTORS = [ 'catch', 'fail' ];
const NON_CLIENT_REQUEST_CALLEES = ['fetch', 'axios', 'XMLHttpRequest' ];
const NON_CLIENT_REQUEST_METHODS = [...NON_CLIENT_REQUEST_CALLEES, 'jQuery', '$'];
const NON_CLIENT_REQUEST_MEMBERS = ['get', 'put', 'post', 'patch', 'delete', 'ajax'];

function isMemberCallExpressionNode(node) {
  // *.*()
  return node &&
         node.type === 'CallExpression' &&
         node.callee.type === 'MemberExpression';
}

function isNonClientRequest(node) {
  // jQuery.ajax() / axios.get
  if (node.type === 'MemberExpression') {
    return (NON_CLIENT_REQUEST_METHODS.includes(node.object.name) &&
            NON_CLIENT_REQUEST_MEMBERS.includes(node.property.name));
  }
  // fetch() / new XMLHttpRequest()
  return NON_CLIENT_REQUEST_CALLEES.includes(node.callee.name);
}

function isThenCallExpression(node) {
  // *.then(*, *)
  return node.callee.property.name === 'then' &&
         node.arguments.length === 2;
}

function isCatchCallExpression(node) {
  // *.catch(*)
  if (PROMISE_REJECTORS.includes(node.callee.property.name) &&
      node.arguments.length === 1) {
    return true;
  }
}

/**
 *  `isClientChain` looks for a chained member expression like
 *
 *  client.request.*
 *
 *    eg: client.request.get, client.request.invoke
 *
 *  It accepts a `node` object of type 'MemberExpression' and looks at
 *  the `object` and `property` values to determine if the current node fits the above
 *  description.
 *
 *  Below is an example node.
 *
 *  {
 *    object: {
 *      type: 'MemberExpression',
 *      object: {
 *        type: 'Identifier',
 *        name: 'client'
 *      },
 *      property: {
 *        type: 'Identifier',
 *        name: 'request'
 *      }
 *    },
 *    property: {
 *      type: 'Identifier',
 *      name: '*'
 *    }
 *  }
 */
function isClientChain(node) {
  return (
    node.object.type === 'MemberExpression' &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'client' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'request'
  );
}

function isPromiseHandler(node) {
  if (!isMemberCallExpressionNode(node)) {
    return false;
  }

  // hello.then/catch()
  return PROMISE_METHODS.includes(node.callee.property.name);
}

function isPromise(node) {
  if (!isMemberCallExpressionNode(node)) {
    return false;
  }

  return (
    // hello.then/catch()
    PROMISE_METHODS.includes(node.callee.property.name) ||
    // client.request.*()
    isClientChain(node.callee)
  );
}

module.exports = {
  isMemberCallExpressionNode,
  isCatchCallExpression,
  isClientChain,
  isPromise,
  isPromiseHandler,
  isThenCallExpression,
  isNonClientRequest
};
