'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs-extra');

const manifest = require('./manifest');
const fileUtil = require('./utils/file-util');

const files = ['./app', './config', './manifest.json'];

module.exports = {
  watch(broadcast) {
    const filesToWatch = [];

    files.forEach((file) => {
      if (fileUtil.fileExists(`${process.cwd()}/${file}`)) {
        filesToWatch.push(file);
      }
    });

    debuglog(`Preparing to watch the following files ${filesToWatch}`);

    filesToWatch.forEach((fileToWatch) => {
      fs.watch(fileToWatch, {persistent: false, recursive: true}, (event, file) => {

        // Reload cache:
        if (file === 'manifest.json') {
          manifest.reload();
        }

        // Broadcast:
        var broadcastMessage = JSON.stringify({ file });

        broadcast(broadcastMessage);
        debuglog(`Broadcasted "${broadcastMessage}" to all listeners.`);
      });
    });
  }
};
