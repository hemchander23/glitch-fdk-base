const textbox = require('./elements/Textbox');
const paragraph = require('./elements/Paragraph');
const dropdown = require('./elements/DropDown');
const email = require('./elements/Email');
const number = require('./elements/Number');
const phoneNumber = require('./elements/PhoneNumber');
const date = require('./elements/Date');
const url = require('./elements/URL');
const radio = require('./elements/Radio');
const checkbox = require('./elements/Checkbox');
const multiselect = require('./elements/MultiSelect');
const api_key = require('./elements/ApiKey');
const domain = require('./elements/Domain');

const htmlTemplate = require('./helper/html_template');
const _ = require('underscore');

class formService {
  /**
   * Constructor for formService
   * @param {Object} config
   * eg:  {
      assets: {
        css: [
          { href: 'https://d367utfepy4pz2.cloudfront.net/fdk/2.0/assets/freshdesk.css' },
          { href: 'https://d367utfepy4pz2.cloudfront.net/configs/v3/freshapps.css' }
        ],
        js: [
          { src: 'https://d367utfepy4pz2.cloudfront.net/fdk/2.0/assets/fresh_client.js' },
          { src: 'https://d367utfepy4pz2.cloudfront.net/configs/v3/freshapps.js' }
        ]
      }
    }
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Converting the FormServ JSON to HTML
   * @param {Object} formServJSON
   * eg: {
     fields: [{
     "name": "display_name",
     "label": "Contact details",
     "hint": "Please enter the contact details",
     "type": "text",
     "default_value": "xxx",
     "required": true,
     "regex": {
       "age-limit": "[1-9][0-9]",
       "age-limit-error": "The age must be between 10-99"
     },
     "visible": true,
     "choices": [],
     "field_options": {
        "fms_custom_attr": "secure-iparam",
        "secure-iparam": true,
        "bind": "",
        "type_attributes": { product: ""}
      },
      "events": [{
         "change": "Callback Function Name"
      }]
     },
     {
       "name": "Contact-Type",
       "label": "Contact type",
       "hint": "Please select the contact type",
       "type": "dropdown",
       "default_value": "Email",
       "required": true,
       "visible": true,
        "choices": [
          "Phone",
          "Email"
        ],
       "field_options": {
         "fms_custom_attr": "secure-iparam",
         "secure-iparam": false,
         "bind": "",
         "type_attributes": { product: ""}
         }
     }]
   }
   * @param {Boolean} hasIparamsJs - if true, inclued iparams.js other wise not.
   * @returns Promise object
   */
  getHtml(formServJSON, hasIparamsJs) {
    return new Promise((resolve, reject) => {
      let htmlStr = '';

      try {
        if (formServJSON !== undefined && formServJSON.fields.length > 0) {
          htmlStr = this.getHtmlTemplate(formServJSON, hasIparamsJs);
        }
        resolve(htmlStr);
      } catch (error) {
        reject(error);
      }
    });
  }

  getHtmlTemplate(formServJSON, hasIparamsJs) {
    const convertedIparams = this.createFormObjects(formServJSON);

    const constructValue = {
      CSS: this.getCSS(),
      javascript: this.getScripts(hasIparamsJs),
      formObjects: convertedIparams
    };
    const template = _.template(htmlTemplate);

    return template(constructValue);
  }

  getAttributes(attributes) {
    return Object.entries(attributes).reduce((total, current) => {
      return total += `${current[0]}='${current[1]}' `;
    }, '');
  }

  getCSS() {
    let staticValue = '';

    if (this.config && this.config.assets && this.config.assets.css) {
      staticValue = this.config.assets.css.reduce((allCSS, currentCSS) => {
        const attributes = this.getAttributes(currentCSS);

        return allCSS + ` <link rel='stylesheet' ${attributes}/> \n`;
      }, '');
    }
    return staticValue;
  }

  getScripts(hasIparamsJs) {
    let staticValue = '';

    if (this.config && this.config.assets && this.config.assets.js) {
      staticValue += this.config.assets.js.reduce((allJs, currentJs) => {
        const attributes = this.getAttributes(currentJs);

        return allJs + ` <script ${attributes}></script> \n`;
      }, '');
    }
    staticValue = hasIparamsJs ? staticValue + '<script src="./assets/iparams.js"></script>' : staticValue;

    return staticValue;
  }

  createFormObjects(data) {
    const convertedIparams = {
      model: {},
      fields: []
    };

    const elementMappings = {
      text: textbox,
      paragraph: paragraph,
      dropdown: dropdown,
      email: email,
      number: number,
      phone_number: phoneNumber,
      date: date,
      url: url,
      radio: radio,
      checkbox: checkbox,
      multiselect: multiselect,
      domain: domain,
      api_key: api_key
    };

    data.fields.forEach(element => {
      convertedIparams.model[element.name] = element.default_value || (element.type === 'multiselect' ? [] : '');
      const elementObject = elementMappings[element.type](element);

      convertedIparams.fields.push(elementObject);
    });

    return JSON.stringify(convertedIparams);
  }
}

module.exports = formService;
