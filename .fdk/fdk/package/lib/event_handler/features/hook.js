'use strict';

const jQueryDeferred = require('jquery-deferred');

const EVENT_NAME = 'onExternalEvent';
const MISSING_EVENT_CALLBACK_ERR = 'Unsupported operation: The generateTargetUrl method cannot be used unless there is a corresponding external event callback';
const UNSUPPORTED_OPERATION = 'Unsupported operation: The generateTargetUrl method cannot be used';
const UNSUPPORTED_OPTION = 'Invalid argument type: The \'options\' argument should be of type string or cannot be greater than 100 characters';
const MAX_LENGTH = 100;
const LOCAL_URL = 'http://localhost:10001';
const EXTERNAL_EVENT_SUPPORT = [
  'onTicketCreate',
  'onTicketUpdate',
  'onConversationCreate',
  'onContactCreate',
  'onContactUpdate',
  'onAppInstall',
  'onExternalEvent'
];

class HookApi {
  constructor(context) {
    this.context = context;
  }

  generateTargetUrl(options, tunnelURL) {
    // eslint-disable-next-line new-cap
    const genHookDefer = jQueryDeferred.Deferred();
    const eventsArray = (this.context.req.meta.events
      || this.context.svrExecScript.events || [])
      .map(item => item.event);
    const isNotRegistered = !eventsArray.includes(EVENT_NAME);

    if (isNotRegistered) {
      genHookDefer.reject({ message: MISSING_EVENT_CALLBACK_ERR });
    }
    else if (!EXTERNAL_EVENT_SUPPORT.includes(this.context.event.categoryArgs.methodName)) {
      genHookDefer.reject({ message: UNSUPPORTED_OPERATION });
    }
    else if (options && (!(options && typeof options.valueOf() === 'string') || options.trim('') === '' || options.length > MAX_LENGTH)) {
      genHookDefer.reject({ message: UNSUPPORTED_OPTION });
    }
    let source = null;

    source = `${tunnelURL || LOCAL_URL}/event/hook/${this.context.product}`;
    const url = options ? `${source}?options=${encodeURIComponent(options)}` : source;

    genHookDefer.resolve(url);
    return genHookDefer;
  }
}

module.exports = HookApi;
