'use strict';

const options = require('./options.json');

const requireLetterOrNumber = value => {
  if (/\w/.test(value)) {
    return true;
  }

  return 'Current Field cannot be Empty';
};

const ques_file = [
  {
    type: 'list',
    name: 'file_name',
    message: 'Select file to be generated',
    choices: options.files
  }
];

const template_file = [
  {
    type: 'list',
    name: 'template_name',
    message: 'Select quick-start file',
    choices: options.starterFiles
  }
];

const oauth_questions = [
  {
    type: 'input',
    name: 'client_id',
    message: 'Enter client_id',
    validate: requireLetterOrNumber
  },
  {
    type: 'input',
    name: 'client_secret',
    message: 'Enter client_secret',
    validate: requireLetterOrNumber
  },
  {
    type: 'input',
    name: 'authorize_url',
    message: 'Enter authorize_url',
    validate: requireLetterOrNumber
  },
  {
    type: 'input',
    name: 'token_url',
    message: 'Enter token_url',
    validate: requireLetterOrNumber
  },
  {
    type: 'list',
    name: 'token_type',
    message: 'Select token_type',
    choices: options.oauthType
  }
];

const iparams_json = [
  {
    type: 'confirm',
    name: 'addassets',
    message: 'Want to add iparam.js (just hit enter for YES)?',
    default: true
  }
];

const iparams_questions = [
  {
    type: 'input',
    name: 'iparam',
    message: 'Enter iparam name',
    validate: requireLetterOrNumber
  },
  {
    type: 'list',
    message: 'Select Type of iparam',
    name: 'iparamType',
    choices: options.iparamType
  },
  {
    type: 'confirm',
    name: 'askAgain',
    message: 'Want to enter another iparam (just hit enter for YES)?',
    default: true
  }
];

const generateIparam = function(iparamName, iparamType) {
  var option = {};

  option.display_name = iparamName;
  option.description = `Please enter your ${iparamName}`;
  option.type = iparamType;
  option.required = true;

  if (iparamType === 'dropdown' || iparamType === 'radio' || iparamType === 'multiselect') {
    option.options = ['opt1', 'opt2', 'opt3'];
    if (iparamType === 'multiselect') {
      option.default_value = ['opt1', 'opt2'];
    } else {
      option.default_value = 'opt1';
    }
  }

  if (iparamType === 'domain' || iparamType === 'api_key') {
    option.type_attributes = {
      product: 'name of the product'
    };
  }

  if (iparamType === 'api_key') {
    option.secure = true;
  }

  if (iparamType === 'checkbox') {
    option.default_value = true;
  }

  return option;
};

const server_questions = [
  {
    type: 'input',
    name: 'event_name',
    message: 'Enter event name',
    validate: requireLetterOrNumber
  },
  {
    type: 'input',
    name: 'callback_function',
    message: 'Enter callback function name',
    validate: requireLetterOrNumber
  },
  {
    type: 'confirm',
    name: 'askAgain',
    message: 'Want to enter another event (just hit enter for YES)?',
    default: true
  }
];

const iparams_html = [
  {
    type: 'input',
    name: 'title',
    message: 'Enter page title',
    validate: requireLetterOrNumber
  },
  {
    type: 'confirm',
    name: 'addjquery',
    message: 'Want to add jquery (just hit enter for YES)?',
    default: true
  },
  {
    type: 'confirm',
    name: 'addfreshclient',
    message: 'Want to add fresh_client.js (just hit enter for YES)?',
    default: true
  },
  {
    type: 'confirm',
    name: 'addassets',
    message: 'Want to add iparam.js and iparam.css (just hit enter for YES)?',
    default: true
  },
  {
    type: 'list',
    name: 'product',
    message: 'Select product css you need to link?',
    choices: ['none', 'freshdesk', 'freshservice', 'freshsales', 'freshchat', 'freshconnect', 'freshcaller', 'freshteam', 'freshworks_crm', 'freshworks']
  }
];

const checkans = answer => {
  if (answer.length < 1) {
    return 'You must choose one app location';
  }
  return true;
};

function getProductQuestions() {
  const supportedProducts = require('../utils/product-info-util').getSupportedProducts();
  const product_questions = [
    {
      type: 'list',
      message: 'Select Product',
      name: 'product',
      choices: supportedProducts
    }
  ];

  return product_questions;
}

function getLocationChoices(product) {
  const locationChoices = require('../utils/product-info-util').getProductLocations(product);
  const appLocations = [
    {
      type: 'checkbox',
      message: 'Select App Location',
      name: 'locations',
      choices: locationChoices,
      validate: checkans
    }
  ];

  return appLocations;
}

module.exports = {
  ques_file,
  template_file,
  oauth_questions,
  iparams_json,
  iparams_questions,
  generateIparam,
  server_questions,
  iparams_html,
  getProductQuestions,
  getLocationChoices
};
