'use strict';

const NUMBER_SIZE = 8;
const SLICE_PREFIX = 8;
const SUPPORTED_ENCODINGS = ['base64'];
const DEFAULT_ENCODING = 'base64';

module.exports = {
  capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  },
  objsize(obj) {
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
  },

  /*
    Function to compare two versions and return if its the latest.
  */
  isGreaterThan(oldVersion, newVersion) {
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
  },

  getTimestamp() {
    const utcTime = new Date().toISOString();

    return new Date(utcTime).getTime();
  },

  templateMethods: {
    encode: (data, encoding) => {
      encoding = SUPPORTED_ENCODINGS.includes(encoding) ? encoding : DEFAULT_ENCODING;
      return new Buffer(data).toString(encoding);
    }
  }
};
