'use strict';

const inquirer = require('inquirer');
const _ = require('lodash');

const generateUtil = require('./generate-utils');
const questions = require('./questions');
const fs = require('../utils/file-util');
const quick_start = require('./quick-start');

const iparamsJsonFile = './config/iparams.json';
const iparamsHtmlFile = './config/iparams.html';

function addUserRequestsToTemplate(answers) {
  const template = _.template(quick_start.iparams_html);
  const constructHeader = {};

  constructHeader.pageTitle = answers.title;
  constructHeader.jquery = '';
  constructHeader.client = '';
  constructHeader.product = '';

  if (answers.addjquery) {
    constructHeader.jquery = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.0/jquery.min.js"></script>';
  }
  if (answers.addfreshclient) {
    constructHeader.client = '<script src="https://static.freshdev.io/fdk/2.0/assets/fresh_client.js"></script>';
  }
  if (answers.product!=='none') {
    constructHeader.product = `<link rel='stylesheet' type='text/css' href='https://static.freshdev.io/fdk/2.0/assets/${answers.product}.css'>`;
  }

  const iparams = template(constructHeader);

  generateUtil.printPreview(iparams, 'iparams.html', false);

  return iparams;
}

function saveContentToFile(content) {
  generateUtil.askUserConfirmationfor(() => {
    if (fs.fileExists(iparamsJsonFile)) {
      fs.deleteFile(iparamsJsonFile);
      console.log('Existing \'iparams.json\' was deleted.');
    }

    fs.writeFile(iparamsHtmlFile, content);
    console.log('\nFile Saved');
  });
}

function generate_iparams_html_file() {
  inquirer.prompt(questions.iparams_html).then(answers => {
    const iparams = addUserRequestsToTemplate(answers);

    saveContentToFile(iparams);
  });
}

module.exports = generate_iparams_html_file;