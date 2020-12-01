'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs-extra');
const nodeDir = require('node-dir');
const path = require('path');
const os = require('os');

const eh = require('./error-util');
const crypto = require('crypto');

const DIGEST_ERROR_MESSAGE = 'Error while generating digest file.';

const RE_IGNORED_FILES = require('./helper-util').IGNORED_FILES;
const DEFAULT_MATCH = /.*/;
const ENCODING = 'utf8';
const BINARY_ENCODING = 'binary';

const PACKAGE_EXTENSION = '.zip';


function getRegex(patterns) {
  return new RegExp(patterns.join('|'));
}

function getAddon() {
  const addonVersion = require('../utils/product-info-util').getAddonVersion();

  return require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/pack_info.json`);
}

function getFiles(options, callback) {
  const addon = getAddon();
  const excludeDir = Array.prototype.concat(addon.DEFAULT_EXCLUDE_PATHS, options.exclude || []);

  nodeDir.readFiles(options.dir, {
    exclude: getRegex(addon.DEFAULT_EXCLUDE_PATHS),
    excludeDir: getRegex(excludeDir),
    match: options.match || DEFAULT_MATCH
  }, (err, content, next) => {
    if (err) { return callback(err); }
    next();
  }, (err, files) => {
    if (err) { return callback(err); }
    callback(null, files);
  });
}

function createWriteStream(...args) {
  return fs.createWriteStream(...args);
}

function ensureFile(fileName) {
  try {
    fs.ensureFileSync(fileName);
  }
  catch (err) {
    eh.error(err);
  }
}

function writeFile(file, data) {
  try {
    fs.outputFileSync(file, data);
  }
  catch (err) {
    eh.error(err);
  }
}

function deleteFile(file) {
  try {
    fs.removeSync(file);
  }
  catch (err) {
    eh.error(err);
  }
}

function readFile(file, encoding) {
  try {
    const charset = encoding || ENCODING;

    if (fs.existsSync(file)) {
      return fs.readFileSync(file, charset);
    }
    return null;
  }
  catch (err) {
    eh.error(err);
  }
}

function readDir(dir) {
  try {
    return fs.readdirSync(dir);
  }
  catch (err) {
    eh.error(err);
  }
}

function ensureDir(dir) {
  try {
    return fs.ensureDirSync(dir);
  }
  catch (err) {
    eh.error(err);
  }
}

function makeDir(dir) {
  try {
    return fs.mkdirSync(dir);
  }
  catch (err) {
    eh.error(err);
  }
}

function statFile(file) {
  try {
    return fs.statSync(file);
  }
  catch (err) {
    eh.error(err);
  }
}

function fileExists(file) {
  try {
    fs.accessSync(file);
  }
  catch (err) {
    return false;
  }
  return true;
}

function removeJunkFiles(file) {
  return !file.match(RE_IGNORED_FILES);
}

function spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory) {
  const markedFiles = [];

  function walk(directory) {
    var files;

    try {
      files = fs.readdirSync(directory);
    }
    catch (e) {
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = path.join(directory, files[i]);

      if (fs.statSync(file).isFile()) {
        const fileExt = path.extname(files[i]).toLowerCase();

        if (ALLOWED_EXTNS.includes(fileExt)) {
          markedFiles.push(file);
        }
      } else if (fs.statSync(file).isDirectory() && !SKIP_FOLDERS.includes(files[i])) {
        walk(file);
      }
    }
  }

  walk(directory);

  return markedFiles;
}

function safeRequire (file) {
  try {
    return require(file);
  }
  catch (e) {
    debuglog(`Error while requiring ${file}: ${e.message}`);
    return {};
  }
}

function writeToDigest(files, callback) {
  files.push('manifest.json');
  debuglog(`Computing digest for ${files}.`);

  let content = '';

  try {
    for (const file of files) {
      content += readFile(`${process.cwd()}/${file}`, BINARY_ENCODING);
    }
    const digest = crypto.createHash('md5').update(content, BINARY_ENCODING).digest('hex');

    writeFile(`${process.cwd()}/digest.md5`, digest);
    callback();
  }
  catch (e) {
    debuglog(`Error while writing digest file "${e.message}"`);
    eh.error(new Error(DIGEST_ERROR_MESSAGE));
  }
}

function genDigestFile(callback) {
  let files = [];

  if (fs.existsSync('./app')) {
    getFiles({ dir: './app' }, function(err, appFiles) {
      if (err) {
        eh.error(new Error(DIGEST_ERROR_MESSAGE));
      }
      files = files.concat(appFiles);
      writeToDigest(files, callback);
    });
  } else {
    writeToDigest(files, callback);
  }
}

function delDigestFile() {
  debuglog('Deleting digest.');
  deleteFile(`${process.cwd()}/digest.md5`);
}
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
    app_id: normalize(folderName)
  };
}

function getRootFolder() {
  return rootFolderName();
}



const internalNameSpace = {
  /*
    Namespace to store custom Iparams data in file
  */
  custom_iparams() {
    return `${getNamespace()['app_id']}_custom_iparams`;
  },

  product_name(meta) {
    return `${getNamespace()['app_id']}_${meta.product}`;
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
    return `${getNamespace()['app_id']}_schedule_${meta.userInput.name}_${meta.scheduleArgs.product}`;
  }
};

function getInternalNamespace(key, meta) {
  return internalNameSpace[key](meta);
}

module.exports = {
  getFiles,
  createWriteStream,
  ensureFile,
  writeFile,
  deleteFile,
  readFile,
  readDir,
  ensureDir,
  makeDir,
  statFile,
  fileExists,
  removeJunkFiles,
  spider,
  safeRequire,
  writeToDigest,
  digest: {
    genDigestFile,
    delDigestFile
  },
  nsresolver: {
    getNamespace,
    getRootFolder,
    getInternalNamespace,
    pkgExt: PACKAGE_EXTENSION
  }
};
