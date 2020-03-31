'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs');
const crypto = require('crypto');

const eh = require('./err');
const fileUtil = require('./file-util');

const digestErrorMsg = 'Error while generating digest file.';
const ENCODING = 'binary';

function writeToDigest(files, callback) {
  files.push('manifest.json');
  debuglog(`Computing digest for ${files}.`);

  let content = '';

  try {
    for (const file of files) {
      content += fileUtil.readFile(`${process.cwd()}/${file}`, ENCODING);
    }
    const digest = crypto.createHash('md5').update(content, ENCODING).digest('hex');

    fileUtil.writeFile(`${process.cwd()}/digest.md5`, digest);
    callback();
  }
  catch (e) {
    debuglog(`Error while writing digest file "${e.message}"`);
    eh.error(new Error(digestErrorMsg));
  }
}

module.exports = {

  genDigestFile(callback) {
    let files = [];

    if (fs.existsSync('./app')) {
      fileUtil.getFiles({dir: './app'}, function(err, appFiles) {
        if (err) {
          eh.error(new Error(digestErrorMsg));
        }
        files = files.concat(appFiles);
        writeToDigest(files, callback);
      });
    } else {
      writeToDigest(files, callback);
    }
  },

  delDigestFile() {
    debuglog('Deleting digest.');
    fileUtil.deleteFile(`${process.cwd()}/digest.md5`);
  }
};
