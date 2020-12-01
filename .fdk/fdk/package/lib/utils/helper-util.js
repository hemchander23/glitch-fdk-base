/* eslint-disable no-useless-escape */
/* eslint-disable max-len */
'use strict';

const NUMBER_SIZE = 8;
const SLICE_PREFIX = 8;
const SUPPORTED_ENCODINGS = ['base64'];
const DEFAULT_ENCODING = 'base64';
const crypto = require('crypto');

const ALGORITHM = 'aes-256-ctr';
const KEY = '783b3c9b0994985e3f08945000982cad';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function objsize(obj) {
  let bytes = 0;

  if (obj !== null && obj !== undefined) {
    switch (typeof obj) {
      case 'number':
        bytes += NUMBER_SIZE;
        break;
      case 'string':
        bytes += obj.length;
        break;
      case 'boolean':
        bytes += 1;
        break;
      case 'object':
        var objClass = Object.prototype.toString.call(obj).slice(SLICE_PREFIX, -1);

        if (objClass === 'Object' || objClass === 'Array') {
          for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
              continue;
            }
            bytes += this.objsize(key);
            bytes += this.objsize(obj[key]);
          }
        }
        else {
          bytes += obj.toString().length;
        }
        break;
    }
  }

  return bytes;
}

/*
  Function to compare two versions and return if its the latest.
*/
function isGreaterThan(oldVersion, newVersion) {
  const oldV = oldVersion.split('.');
  const oMajor = Number(oldV[0]);
  const oMinor = Number(oldV[1]);
  const oPatch = Number(oldV[2]);

  const newV = newVersion.split('.');
  const nMajor = Number(newV[0]);
  const nMinor = Number(newV[1]);
  const nPatch = Number(newV[2]);

  if (nMajor > oMajor) {
    return true;
  }
  else if (nMajor === oMajor) {
    if (nMinor > oMinor) {
      return true;
    }
    else if (nMinor === oMinor) {
      if (nPatch > oPatch) {
        return true;
      }
    }
  }
  return false;
}

function getTimestamp() {
  const utcTime = new Date().toISOString();

  return new Date(utcTime).getTime();
}

function md5Digest(string) {
  return crypto
          .createHash('md5')
          .update(string, DEFAULT_ENCODING)
          .digest('hex');
}

function encryptToken(token){
  // eslint-disable-next-line
  const IV = new Buffer(crypto.randomBytes(16));
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
  let crypted = cipher.update(token, inputEncoding, outputEncoding);

  crypted += cipher.final(outputEncoding);

  return `${IV.toString(outputEncoding)}:${crypted.toString()}`;
}

function decryptToken(encryptedtoken){
  const textParts = encryptedtoken.split(':');
  const IV = new Buffer(textParts.shift(), outputEncoding);
  const encryptedText = new Buffer(textParts.join(':'), outputEncoding);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
  let decrypted = decipher.update(encryptedText, outputEncoding, inputEncoding);

  decrypted += decipher.final(inputEncoding);

  return decrypted.toString();
}

const templateMethods = {
  encode: (data, encoding) => {
    encoding = SUPPORTED_ENCODINGS.includes(encoding) ? encoding : DEFAULT_ENCODING;
    return new Buffer(data).toString(encoding);
  }
};

const DEFAULT_REGEX_FIELDS = {

  email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,

  number: /^-?\d*\.?\d*\d$/,

  url: /https:\/\/(www\.)?[-a-zA-Z0-9@:*%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/,

  phone_number: /(^\d{10}$)|(^\d{3}-\d{3}-\d{4}$)/,

  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

};

const IGNORED_FILES = /^\.(.)*$|^\.Spotlight-V100$|\.Trashes$|^Thumbs\.db$|^desktop\.ini$/g;

/**
 * Acts as an async wrapper for route handler functions to capture errors and
 * pass it to `next` function. Since express doesn't treat handlers as async,
 * any exception would be treated as uncaught.
 *
 * @param  {Function} fn - route handler
 * @returns {Function} async wrapper function
 */
function asyncHandler(fn) {
  return function asyncify(...args) {
    const next = args[args.length - 1];

    return Promise.resolve(fn(...args)).catch(next);
  };
}

module.exports = {
  asyncHandler,
  capitalize,
  objsize,
  isGreaterThan,
  getTimestamp,
  templateMethods,
  DEFAULT_REGEX_FIELDS,
  IGNORED_FILES,
  crypto:{
    md5Digest,
    encryptToken,
    decryptToken
  }
};
