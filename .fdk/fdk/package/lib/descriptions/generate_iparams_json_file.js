'use strict';

const inquirer = require('inquirer');
const generateUtil = require('./generate-utils');
const questions = require('./questions');
const fs = require('../utils/file-util');

const iparamsJsonFile = './config/iparams.json';
const iparamsHtmlFile = './config/iparams.html';
const iparamsAssets = './config/assets';
const iparamsJsFile = `${iparamsAssets}/iparams.js`;
const iparamsCSSFile = `${iparamsAssets}/iparams.css`;

const iparams = {};

function addAssets(answers) {
  fs.ensureDir(iparamsAssets);
  if (answers.addassets) {
    fs.writeFile(iparamsJsFile, '');
    if (fs.fileExists(iparamsCSSFile)) {
      fs.deleteFile(iparamsCSSFile);
      console.log('Existing \'iparams.css\' was deleted.');
    }
  } else {
    fs.deleteFile(iparamsAssets);
    console.log('Existing \'Assets\' folder was deleted.');
  }
}

function saveContentToFile(iparams, hasAssets) {
  generateUtil.askUserConfirmationfor(() => {
    if (fs.fileExists(iparamsHtmlFile)) {
      fs.deleteFile(iparamsHtmlFile);
      console.log('Existing \'iparams.html\' was deleted.');
    }

    addAssets(hasAssets);

    generateUtil.copy_json(iparamsJsonFile, iparams);
  });
}

function printPreview(iparams) {
  generateUtil.printPreview(iparams, 'iparams.json', true);
}

function generate_iparamsfile() {
  inquirer.prompt(questions.iparams_questions).then(answers => {
    iparams[answers.iparam] = questions.generateIparam(answers.iparam, answers.iparamType);
    if (answers.askAgain) {
      generate_iparamsfile();
    } else {
      inquirer.prompt(questions.iparams_json).then(hasAssets => {
        printPreview(iparams);
        saveContentToFile(iparams, hasAssets);
      });
    }
  });
}

module.exports = generate_iparamsfile;
