'use strict';

const inquirer = require('inquirer');
const fs = require('../utils/file-util');

const questions = require('../descriptions/questions');
const buildOauthFile = require('../descriptions/generate_oauth_config_file');
const buildIparamsJsonFile = require('../descriptions/generate_iparams_json_file');
const buildQuickStartFiles = require('../descriptions/generate_quick-start_files');
const buildManifestJsonFile = require('../descriptions/generate_manifest_json_file');
const buildIparamsHtmlFile = require('../descriptions/generate_iparams_html_file');
const buildServerFile = require('../descriptions/generate_server_js_file');

const generateFile = {
  'oauth_config.json' : buildOauthFile,
  'iparams.json' : buildIparamsJsonFile,
  'server.js' : buildServerFile,
  'iparams.html' : buildIparamsHtmlFile,
  'manifest.json' : buildManifestJsonFile,
  'quick start files': buildQuickStartFiles
};


const isManifestPresent = fs.fileExists(`${process.cwd()}/manifest.json`);
const isConfigFolderPresent = fs.fileExists(`${process.cwd()}/config`);
const error = '\x1b[31m[ERROR]\x1b[0m';


function checkApp() {
  const errorMsg = [];

  if (!isManifestPresent) {
    errorMsg.push(`${error}'manifest.json' not present in current/specified directory`);
  }
  if (!isConfigFolderPresent) {
    errorMsg.push(`${error}'config' folder not present in current/specified directory`);
  }
  if (errorMsg && errorMsg.length > 0) {
    errorMsg.forEach(msg => console.log(msg));
    process.exit(1);
  }
}

module.exports = {
  run: function() {

    checkApp();

    inquirer.prompt(questions.ques_file).then(ans => {
      generateFile[ans.file_name]();
    });
  }
};
