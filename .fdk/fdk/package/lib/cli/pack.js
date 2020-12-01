'use strict';

const debuglog = __debug.bind(null, __filename);

const archiver = require('archiver');
const async = require('async');
const path = require('path');
const os = require('os');
const _ = require('lodash');

const eh = require('../utils/error-util');
const fileUtil = require('../utils/file-util');
const validator = require('./validate');
const digestFile = require('../utils/file-util').digest;
const manifest = require('../manifest');
const nsUtil = require('../utils/file-util').nsresolver;

const {
  PRE_PKG_VALIDATION,
  POST_PKG_VALIDATION
} = require('../validations/constants').validationContants;

const productInfo = require('../utils/product-info-util');

const pkgName = `${nsUtil.getRootFolder()}${nsUtil.pkgExt}`;
const PACKAGE_ERROR_MESSAGE = 'Error while generating package.';
const DOCUMENTATION_REFERENCE = productInfo.getDeployLink();

const addonVersion = require('../utils/product-info-util').getAddonVersion();
const addon = require(`${os.homedir()}/.fdk/addon/addon-${addonVersion}/pack_info.json`);

const SERVER_DIR_ALLOWED_FILES = new RegExp(addon.SERVER_DIR_ALLOWED_FILES.join('|'));
const SERVER_DIR_EXCLUDED_FOLDERS = addon.SERVER_DIR_EXCLUDED_FOLDERS;

function fetchDirectory(options, callback) {
  if (!fileUtil.fileExists(options.dir)) {
    debuglog(`Cannot find '${options.dir}' directory while packing.`);
    return callback();
  }

  return fileUtil.getFiles(options, function(error, files) {
    if (error) {
      debuglog(`Error while fetching '${options.dir}' files ${error.message}`);
      return callback(new Error(PACKAGE_ERROR_MESSAGE));
    }

    // Unfortunately, our backend services expect file paths to start with `./`
    // DONT REMOVE THIS LINE. Digest computation depends on this.
    files = files.map(filepath => `./${filepath}`);

    return callback(null, files);
  });
}

function fetchFile(filename, callback) {
  if (fileUtil.fileExists(filename)) {
    return callback(null, [ filename ]);
  }

  return callback();
}

const fetchAppDirectory = callback => fetchDirectory({ dir: './app' }, callback);

const fetchSourceDirectory = callback => fetchDirectory({ dir: './src' }, callback);

const fetchServerDirectory = callback => fetchDirectory({
  dir: './server',
  match: SERVER_DIR_ALLOWED_FILES,
  exclude: SERVER_DIR_EXCLUDED_FOLDERS || []
}, callback);

const fetchConfigDirectory = callback => fetchDirectory({ dir: './config' }, callback);

const fetchManifestFile = callback => fetchFile('./manifest.json', callback);

const fetchActionFile = callback => fetchFile('./actions.json', callback);

const fetchReportFile = callback => fetchFile('./.report.json', callback);

const fetchREADMEFile = callback => fetchFile('./README.md', callback);

function fetchDigestFile(callback) {
  return digestFile.genDigestFile(() => callback(null, [ './digest.md5' ]));
}

function generateZIP(zipper) {
  function packFiles(error, files) {
    if (error) {
      return eh.error(error);
    }

    files = _.compact(_.flatten(files));

    files.forEach(file => {
      debuglog(`Packing ${file}`);
      zipper.file(file);
    });

    return zipper.finalize();
  }

  return async.series([
    fetchAppDirectory,
    fetchSourceDirectory,
    fetchServerDirectory,
    fetchConfigDirectory,
    fetchManifestFile,
    fetchActionFile,
    fetchReportFile,
    fetchREADMEFile,
    fetchDigestFile
  ], packFiles);
}

function cleanFiles(errored) {
  digestFile.delDigestFile();

  if (errored) {
    debuglog('Deleting dist/ directory.');
    fileUtil.deleteFile(`${process.cwd()}/dist`);
  }
}

function packApp(skipValidation) {
  const zipper = archiver('zip');

  const dest = `${process.cwd()}/dist/${pkgName}`;

  fileUtil.ensureFile(dest);

  const outputStream = fileUtil.createWriteStream(dest);

  outputStream.on('close', async function(error) {
    if (error) {
      cleanFiles(true);
      debuglog(`Error while creating package ${error.message}`);
      return eh.error(new Error(PACKAGE_ERROR_MESSAGE));
    }

    const postPkgValidation = await validator.run(POST_PKG_VALIDATION, skipValidation);
    const product = Object.keys(manifest.product)[0];

    if (!_.isEmpty(postPkgValidation)) {
      fileUtil.deleteFile(dest);
      eh.printError('Packing failed due to the following issue(s):', postPkgValidation);
    }

    console.log(`App packed successfully at ${path.sep}dist${path.sep}${pkgName}`);
    console.log(`Upload this file to the marketplace by following the instructions at ${DOCUMENTATION_REFERENCE[product]}`);
    cleanFiles();
  });

  zipper.on('error', function(error) {
    cleanFiles(true);
    debuglog(`Error while zipping ${error.message}`);
    eh.error(new Error(PACKAGE_ERROR_MESSAGE));
  });

  zipper.pipe(outputStream);

  return generateZIP(zipper);
}

module.exports = {
  run: async function(skipValidation) {
    debuglog(`'pack' called with ${JSON.stringify(arguments)}`);

    const errors = await validator.run(PRE_PKG_VALIDATION, skipValidation);

    if (errors.length > 0) {
      eh.printError('Packing failed due to the following issue(s):', errors);
    }

    return packApp(skipValidation);
  }
};
