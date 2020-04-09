'use strict';

const inquirer = require('inquirer');
const generateUtil = require('./generate-utils');
const questions = require('./questions');

const manifestFile = './manifest.json';

const manifest = {};

manifest['platform-version'] = '2.0';

const location_obj = {
  url: 'template.html',
  icon: 'icon.svg'
};

function buildManifest(ans, loc, manifest, answers) {
  ans.locations.forEach(element => {
    loc.location[element] = location_obj;
  });
  manifest.product[answers.product] = loc;
  manifest['whitelisted-domains'] = [];
  generateUtil.printPreview(manifest, 'manifest.json', true);
}

function generateFile(product, loc, manifest, answers) {
  inquirer.prompt(questions.getLocationChoices(product))
    .then(ans => {
      buildManifest(ans, loc, manifest, answers);
      generateUtil.askUserConfirmationfor(() => generateUtil.copy_json(manifestFile, manifest));
    });
}

function generate_manifest_json_file() {
  inquirer.prompt(questions.getProductQuestions())
    .then(answers => {
      const loc = {};

      loc.location = {};
      manifest.product = {};
      generateFile(answers.product, loc, manifest, answers);
    });
}

module.exports = generate_manifest_json_file;
