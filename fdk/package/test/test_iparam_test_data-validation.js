'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const tmp = require('tmp');

describe('iparam test data validate', () => {

  let projDir, iparamTestDataValidator;
  let iparamJsonFile, iparamTestDataFile;

  before(() => {
    projDir = tmp.dirSync({prefix: 'freshapps_sdk'});
    require(__dirname + '/../lib/cli/init').run(projDir.name, 'your_first_app', 'freshdesk');
    process.chdir(projDir.name);
    require(__dirname + '/../lib/manifest').reload();
    iparamJsonFile = './config/iparams.json';
    iparamTestDataFile = './config/iparam_test_data.json';
    iparamTestDataValidator = require('../lib/validations/iparam_test_data-validation');
  });

  describe('required validation', () => {

    it('should throw error if required in iparams.json but not present in iparam_test_data.json', () => {
      const jsonData = {
        name: {
          display_name: 'Name',
          type: 'text',
          description: 'Enter your Name',
          default_value: 'Sumit',
          required: true
        }
      };
      const testData = {};

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      fs.writeFileSync(iparamTestDataFile, JSON.stringify(testData), 'utf8');
      expect(['\'name\' is a required field.']).eql(iparamTestDataValidator.validate());
    });

    it('should succeed if not required in iparams.json and not present in iparam_test_data.json', () => {
      const jsonData = {
        name: {
          display_name: 'Name',
          type: 'text',
          description: 'Enter your Name',
          default_value: 'Sumit',
          required: false
        }
      };
      const testData = {};

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      fs.writeFileSync(iparamTestDataFile, JSON.stringify(testData), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());
    });

  });

  describe('custom regex validation', () => {

    it('should return error for text field', () => {
      const jsonData = {
        name: {
          display_name: 'Name',
          type: 'text',
          description: 'Enter your Name',
          regex: {
            'name': '^[a-zA-Z0-9]*$',
            'name-error': 'Name should be alphanumeric',
            'length': '^[a-zA-Z0-9]{1,8}$',
            'length-error': 'Length within only 1 and 8 only'
          }
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ name: 'Sumit' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ name: 'testdata1234' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'name\': Length within only 1 and 8 only']).eql(iparamTestDataValidator.validate());
    });

    it('should return error for email field', () => {
      const jsonData = {
        email: {
          display_name: 'Email',
          type: 'email',
          description: 'Enter your Email',
          regex: {
            'name': '^(.*?)@(.*?).(.{2,3})$',
            'name-error': 'enter a valid email address'
          }
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ email: 'test@email.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ email: 'test@' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'email\': enter a valid email address']).eql(iparamTestDataValidator.validate());
    });

    it('should return error for number field', () => {
      const jsonData = {
        number: {
          display_name: 'Number',
          type: 'number',
          description: 'Enter the Number',
          regex: {
            'name': '^[0-9]*$',
            'name-error': 'number should be numeric'
          }
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '123' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '234abc' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'number\': number should be numeric']).eql(iparamTestDataValidator.validate());
    });

    it('should return error for url field', () => {
      const jsonData = {
        url: {
          display_name: 'URL',
          type: 'url',
          description: 'Enter the URL',
          regex: {
            'name': '^(https://www.)?[a-z0-9]+[.]{1}[a-z0-9]+',
            'name-error': 'enter a valid url'
          }
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'https://www.test.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'test' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'url\': enter a valid url']).eql(iparamTestDataValidator.validate());
    });

    it('should throw error if regex used for types not supported.', () => {
      const jsonData = {
        country: {
          display_name: 'Country',
          type: 'dropdown',
          options: ['India', 'Europe', 'US'],
          description: 'Select your country',
          default_value: 'Europe',
          required: true,
          regex: {
            'name': '^[a-zA-Z]+$',
            'name-error': 'enter a valid text.'
          }
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ country: 'India' }), 'utf8');
      const iparamValidator = require('../lib/validations/iparam-validation');

      expect(['Regex for \'dropdown\' type is not supported.']).eql(iparamValidator.validate());
    });

  });

  describe('default regex validation', () => {

    it('should return error for invalid email field', () => {
      const jsonData = {
        email: {
          display_name: 'Email',
          type: 'email',
          description: 'Enter the Email'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ email: 'abc@gmail.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ email: 'abc@def@gmail.com' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'email\': Please enter a valid email.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ email: 'abc@gmail.com' }), 'utf8');
      jsonData.email.default_value = 'abc@def@gmail.com';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'email\': Please enter a valid email.']).eql(iparamTestDataValidator.validateDefaultValue('email', jsonData.email));
    });

    it('should return error for invalid url field', () => {
      const jsonData = {
        url: {
          display_name: 'URL',
          type: 'url',
          description: 'Enter the URL'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'https://www.google.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'https://*.google.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'https://dev-staging.freshdesk.com' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'www.dev-staging.freshdesk.com' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'url\': Please enter a valid URL.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'http://www.hello.com' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'url\': Please enter a valid URL.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ url: 'https://www.google.com' }), 'utf8');
      jsonData.url.default_value = 'www.dev-staging.freshdesk.com';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'url\': Please enter a valid URL.']).eql(iparamTestDataValidator.validateDefaultValue('url', jsonData.url));
    });

    it('should return error for invalid phone_number field', () => {
      const jsonData = {
        phone: {
          display_name: 'Phone',
          type: 'phone_number',
          description: 'Enter the Phone Number'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ phone: '9876545677' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ phone: '987-654-5677' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ phone: '987-832654-5677' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'phone\': Please enter a valid phone_number. It should be a 10 digit number such as 1234567890 or 123-456-7890.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ phone: '9876545677' }), 'utf8');
      jsonData.phone.default_value = '987-832654-5677';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'phone\': Please enter a valid phone_number. It should be a 10 digit number such as 1234567890 or 123-456-7890.']).eql(iparamTestDataValidator.validateDefaultValue('phone', jsonData.phone));
    });

    it('should return error for invalid number type field', () => {
      const jsonData = {
        number: {
          display_name: 'Number',
          type: 'number',
          description: 'Enter the Number'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '9876545677' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '-987.5677' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '987238abc' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'number\': Please enter a valid number.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ number: '9876545677' }), 'utf8');
      jsonData.number.default_value = '987238abc';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'number\': Please enter a valid number.']).eql(iparamTestDataValidator.validateDefaultValue('number', jsonData.number));
    });

    it('should return error for invalid date field', () => {
      const jsonData = {
        date: {
          display_name: 'Date',
          type: 'date',
          description: 'Enter the Date',
          default_value: '2014-02-12'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ date: '2014-02-13' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ date: '2014/02/13' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ date: '13-02-2014' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ date: '13/02/2014' }), 'utf8');
      expect(['For \'Iparam test data\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ date: '2014-02-13' }), 'utf8');
      jsonData.date.default_value = '2014/02/13';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validateDefaultValue('date', jsonData.date));

      jsonData.date.default_value = '13-02-2014';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validateDefaultValue('date', jsonData.date));

      jsonData.date.default_value = '13/02/2014';
      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');
      expect(['For \'default_value\' of the \'date\': Please enter a valid date. It should be in the YYYY-MM-DD format.']).eql(iparamTestDataValidator.validateDefaultValue('date', jsonData.date));
    });

  });

  describe('validate test data with options', () => {
    it ('should return error for dropdown', () => {
      const jsonData = {
        dropdown: {
          display_name: 'dropdown',
          type: 'dropdown',
          description: 'Select a value',
          options: ['option1', 'option2', 'option3'],
          default_value: 'option3'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ dropdown: 'option2' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ dropdown: 'option4' }), 'utf8');
      expect(['Test data for \'dropdown\' is not specified in the options']).eql(iparamTestDataValidator.validate());
    });

    it ('should return error for radio', () => {
      const jsonData = {
        radio: {
          display_name: 'radio',
          type: 'radio',
          description: 'Select a value',
          options: ['option1', 'option2', 'option3'],
          default_value: 'option3'
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ radio: 'option2' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ radio: 'option4' }), 'utf8');
      expect(['Test data for \'radio\' is not specified in the options']).eql(iparamTestDataValidator.validate());
    });

    it ('should return error for multiselect', () => {
      const jsonData = {
        multiselect: {
          display_name: 'multiselect',
          type: 'multiselect',
          description: 'Select a value',
          options: ['option1', 'option2', 'option3'],
          default_value: ['option1', 'option2']
        }
      };

      fs.writeFileSync(iparamJsonFile, JSON.stringify(jsonData), 'utf8');

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ multiselect: 'option2' }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ multiselect: ['option2', 'option3'] }), 'utf8');
      expect([]).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ multiselect: 'option4' }), 'utf8');
      expect(['Test data for \'multiselect\' is not specified in the options']).eql(iparamTestDataValidator.validate());

      fs.writeFileSync(iparamTestDataFile, JSON.stringify({ multiselect: ['option1', 'option4'] }), 'utf8');
      expect(['Test data for \'multiselect\' is not specified in the options']).eql(iparamTestDataValidator.validate());
    });
  });
});