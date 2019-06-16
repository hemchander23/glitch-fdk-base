'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs-extra');
const nodeDir = require('node-dir');
const path= require('path');
const os = require('os');

const eh = require('./err');

// TODO: This is actually a duplicate of the regex found in the addon. Should use that.
const RE_IGNORED_FILES = /^\.(.)*$|^\.Spotlight-V100$|\.Trashes$|^Thumbs\.db$|^desktop\.ini$/;
const DEFAULT_MATCH = /.*/;
const ENCODING = 'utf8';

var getRegex = function(patterns) {
  return new RegExp(patterns.join('|'));
};

var getAddon = function() {
  const addonVersion = require('../utils/product-info-util').getAddonVersion();

  return require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/pack_info.json`);
};

module.exports = {
  getFiles(options, callback) {
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
  },

  createWriteStream(...args) {
    return fs.createWriteStream(...args);
  },

  ensureFile(fileName) {
    try {
      fs.ensureFileSync(fileName);
    }
    catch (err) {
      eh.error(err);
    }
  },

  writeFile(file, data) {
    try {
      fs.writeFileSync(file, data);
    }
    catch (err) {
      eh.error(err);
    }
  },

  deleteFile(file) {
    try {
      fs.removeSync(file);
    }
    catch (err) {
      eh.error(err);
    }
  },

  readFile(file, encoding) {
    try {
      const charset = encoding || ENCODING;

      return fs.readFileSync(file, charset);
    }
    catch (err) {
      eh.error(err);
    }
  },

  readDir(dir) {
    try {
      return fs.readdirSync(dir);
    }
    catch (err) {
      eh.error(err);
    }
  },

  makeDir(dir) {
    try {
      return fs.mkdirSync(dir);
    }
    catch (err) {
      eh.error(err);
    }
  },

  statFile(file) {
    try {
      return fs.statSync(file);
    }
    catch (err) {
      eh.error(err);
    }
  },

  fileExists(file) {
    try {
      fs.accessSync(file);
    }
    catch (err) {
      return false;
    }
    return true;
  },

  removeJunkFiles(file) {
    return !file.match(RE_IGNORED_FILES);
  },

  spider(SKIP_FOLDERS, ALLOWED_EXTNS, directory) {
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
  },

  /**
   *  Try requiring the file. Else, fallback to empty exports.
   */
  safeRequire: function(file) {
    try {
      return require(file);
    }
    catch (e) {
      debuglog(`Error while requiring ${file}: ${e.message}`);
      return {};
    }
  }
};
