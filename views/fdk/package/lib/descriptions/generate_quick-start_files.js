'use strict';

const inquirer = require('inquirer');
const questions = require('./questions');
const fs = require('../utils/file-util');
const quick_start = require('./quick-start');

function generateOauthStarterKit() {
  fs.writeFile('./app/app.js', quick_start.oauth_template);
}

function checkForServerFolder() {
  if (!fs.fileExists('./server/server.js')) {
    console.log('[ERROR] Create serverless app for this option. \'server\' file is not present');
    process.exit(1);
  }
}

function generateExternalEventsStarterKit() {
  checkForServerFolder();
  fs.writeFile('./server/server.js', quick_start.external_events_template);
}

const buildTemplates = {
  'oauth starter kit' : generateOauthStarterKit,
  'external events app starter kit' : generateExternalEventsStarterKit
};

function generate_quick_start_files() {
  inquirer.prompt(questions.template_file)
    .then(answers => {
      buildTemplates[answers.template_name]();
    });
}

module.exports = generate_quick_start_files;