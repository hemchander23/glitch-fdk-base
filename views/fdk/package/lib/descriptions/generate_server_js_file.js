'use strict';

const inquirer = require('inquirer');
const _ = require('lodash');

const generateUtil = require('./generate-utils');
const questions = require('./questions');
const fs = require('../utils/file-util');
const quick_start = require('./quick-start');

const eventArr = [];

const generate_serverjsfile = function() {

  inquirer.prompt(questions.server_questions).then(answers => {

    eventArr.push({event: answers.event_name, callback: answers.callback_function});
    if (answers.askAgain) {
      generate_serverjsfile();
    } else {
      const template = _.template(quick_start.serverTemplate);
      const arr1 = [];
      const arr2 = [];

      eventArr.forEach(x => {
        arr1.push(`\n\t{ event: '${x.event}', callback: '${x.callback}' },`);
      });

      eventArr.forEach(x => {
        arr2.push(`\n${x.callback}: function(args) {
                console.log('Hello ' + args['data']['requester']['name']);
            },`);
      });
      const serverfile = template({'events' : arr1, 'eventFunctions' : arr2});

      generateUtil.printPreview(serverfile, 'server.js', false);

      generateUtil.askUserConfirmationfor(() => {
        if (!fs.fileExists('./server')) {
          fs.makeDir('./server');
        }

        fs.writeFile('./server/server.js', serverfile);
        console.log('The file was saved');
      });
    }
  });
};

module.exports = generate_serverjsfile;
