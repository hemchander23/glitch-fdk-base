'use strict';

const archiver = require('archiver');
const fs =require('fs');
const gulp = require('gulp');
const path = require('path');
const replace = require('gulp-replace');

const STAGING_URL = 'freshcloud.io';
const PRODUCTION_URL = 'freshdev.io';

const FILES = [
  './lib/web/views/event-page.html',
  './lib/web/views/event-page-404.html',
  './lib/web/views/oauth-forms.html',
  './lib/web/views/custom-iparams.html',
  './lib/web/assets/js/event-page.js',
  './lib/cli/version.js',
  './lib/updater.js'
];

gulp.task('staging', async () => {
  FILES.forEach(async (file) => {
    await gulp.src(file)
      .pipe(replace(PRODUCTION_URL, STAGING_URL))
      .pipe(gulp.dest(path.parse(file).dir));
  });
});

gulp.task('production', async () => {
  FILES.forEach(async (file) => {
    await gulp.src(file)
      .pipe(replace(STAGING_URL, PRODUCTION_URL))
      .pipe(gulp.dest(path.parse(file).dir));
  });
});

gulp.task('generate-version', async () => {
  const versionData = require('./version-ws/version.json');
  const packageJSONVersion = require('./package.json').version;
  const addonVersion = require('./addon/package.json').version;

  versionData.fdkCli.version = packageJSONVersion;
  versionData.fdkCli.dl = `http://dl.freshdev.io/cli/fdk-${packageJSONVersion}.tgz`;
  versionData.fdkCli.cmd = `npm install https://dl.freshdev.io/cli/fdk-${packageJSONVersion}.tgz -g`;

  versionData.addon.version = addonVersion;
  versionData.addon.dl = `http://dl.freshdev.io/cli-addon/addon-${addonVersion}.zip`;

  fs.writeFileSync('./version-ws/version.json', JSON.stringify(versionData));
});

gulp.task('generate-addon-zip', async () => {
  const output = fs.createWriteStream(`${__dirname}/addon-${require('./addon/package.json').version}.zip`);
  const archive = archiver('zip');

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);
  archive.directory('./addon', '');
  archive.finalize();
});