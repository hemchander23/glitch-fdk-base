'use strict';

const path = require('path');

const PACKAGE_EXTENSION = '.zip';

function rootFolderName() {
  return process.cwd().split(path.sep).pop();
}

function normalize(folderName) {
  const MAX_CHARS = 6;
  let processed = folderName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');

  if (processed.length > MAX_CHARS) {
    processed = processed.substring(0, MAX_CHARS);
  }
  return processed + '_101_101';
}

function getNamespace() {
  const folderName = rootFolderName();

  return {
    app_id : normalize(folderName)
  };
}

const internalNameSpace = {
  /*
    Namespace to store custom Iparams data in file
  */
  custom_iparams() {
    return `${getNamespace()['app_id']}_custom_iparams`;
  },

  /*
    Namespace to store md5 hash of dependencies of the project
  */
  dpn_hash() {
    return `${getNamespace()['app_id']}_dpn_hash`;
  },

  /*
    Namespace to store schedule events
  */
  schedule(meta) {
    return `${getNamespace()['app_id']}_schedule_${meta}`;
  }
};

module.exports = {

  getNamespace,

  getRootFolder () {
    return rootFolderName();
  },

  getInternalNamespace(key, meta) {
    return internalNameSpace[key](meta);
  },

  pkgExt: PACKAGE_EXTENSION
};
