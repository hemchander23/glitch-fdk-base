'use strict';

/* eslint-disable no-underscore-dangle */

const os = require('os');
const path = require('path');
const util = require('util');

const temp = util.debuglog('fdk');

global.__debug = (filename, ...args) => temp('(\x1b[34m%s\x1b[0m) \x1b[31m%s\x1b[0m', path.basename(filename), util.format.apply(null, args));

__debug(__filename, `Starting FDK in node ${process.version} on ${os.platform()}`);
