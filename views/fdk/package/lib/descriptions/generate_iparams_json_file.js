'use strict';

const inquirer = require('inquirer');
const generateUtil = require('./generate-utils');
const questions = require('./questions');
const fs = require('../utils/file-util');

const iparamsJsonFile = './config/iparams.json';
const iparamsTestFile = './config/iparam_test_data.json';
const iparamsHtmlFile = './config/iparams.html';

const iparams = {};
const iparamsTest = {};

function saveContentToFile(iparams, iparamsTest) {
  generateUtil.askUserConfirmationfor(() => {
    if (fs.fileExists(iparamsHtmlFile)) {
      fs.deleteFile(iparamsHtmlFile);
      console.log('Existing \'iparams.html\' was deleted.');
    }

    generateUtil.copy_json(iparamsJsonFile, iparams);
    generateUtil.copy_json(iparamsTestFile, iparamsTest);
  });
}

function printPreview(iparams, iparamsTest) {
  generateUtil.printPreview(iparamsTest, 'iparam_test_data.json');
  generateUtil.printPreview(iparams, 'iparams.json', true);
}

function generate_iparamsfile() {
  inquirer.prompt(questions.iparams_questions).then(answers => {
    iparamsTest[answers.iparam] = `Enter ${answers.iparamType} data`;
    iparams[answers.iparam] = questions.generateIparam(answers.iparam, answers.iparamType);
    if (answers.askAgain) {
      generate_iparamsfile();
    } else {
      printPreview(iparams, iparamsTest);
      saveContentToFile(iparams, iparamsTest);
    }
  });
}

module.exports = generate_iparamsfile;