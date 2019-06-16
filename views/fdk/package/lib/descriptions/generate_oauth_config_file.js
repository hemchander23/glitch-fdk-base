'use strict';

const inquirer = require('inquirer');
const generateUtil = require('./generate-utils');
const questions = require('./questions');

const oauth_file = './config/oauth_config.json';

function generate_oauthFile() {
  inquirer.prompt(questions.oauth_questions).then(answers => {
    answers.options = {scope: 'read'};
    generateUtil.printPreview(answers, 'oauth_config.json', true);
    generateUtil.askUserConfirmationfor(() => generateUtil.copy_json(oauth_file, answers));
  });
}

module.exports = generate_oauthFile;