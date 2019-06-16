'use strict';

const fs = require('../utils/file-util');
const inquirer = require('inquirer');

const askUserConfirmationfor = execute => {
  inquirer.prompt([
    {
      type: 'confirm',
      name: 'askConfirmation',
      message: 'Do you want to overwrite the current file (just hit enter for NO)?',
      default: false
    }
  ]).then(ans => {
    if (ans.askConfirmation) {
      execute();
    }
  });
};

const copy_json = (file_location, file) => {
  const content = JSON.stringify(file, undefined, 2);

  fs.writeFile(file_location, content);
};

const printPreview = (content, heading, isJson) => {
  console.log(`\n-----${heading}------\n`);
  if (isJson) {
    console.log(JSON.stringify(content, null, '  '));
  } else {
    console.log(content);
  }
};

module.exports = {
  askUserConfirmationfor,
  copy_json,
  printPreview
};