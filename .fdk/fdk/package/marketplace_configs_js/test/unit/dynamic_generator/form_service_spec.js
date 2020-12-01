var mocha = require('mocha');
var formService = require("~src/dynamic_generator/form_service");
var expect = require('chai').expect;
var cheerio = require('cheerio');

var config = {
  assets: {
    css: [{
        href: 'https://d367utfepy4pz2.cloudfront.net/fdk/2.0/assets/freshdesk.css'
      },
      {
        href: 'https://d367utfepy4pz2.cloudfront.net/configs/v2/freshapps.css'
      },
    ],
    js: [{
        src: 'https://d367utfepy4pz2.cloudfront.net/fdk/2.0/assets/fresh_client.js'
      },
      {
        src: 'https://d367utfepy4pz2.cloudfront.net/configs/v2/freshapps.js'
      }
    ]
  }
};

const IPARAM_JSON = {
  "Contact": {
    "display_name": "Contact details",
    "description": "Please enter the contact details",
    "type": "text",
    "required": true,
    "secure": true,
    "visible": true,
    "regex": {
      "regex1": "[a-z][A-Z]",
      "regex1-error": "contact details should be only text"
    },
    "events": [{
      "change": "onContactChange"
    }]
  },
  "Age": {
    "display_name": "Age",
    "description": "Please enter your age in years",
    "type": "number",
    "secure": true,
    "required": true
  },
  "Contact-Type": {
    "display_name": "Contact Type",
    "description": "Please select the contact type",
    "type": "dropdown",
    "secure": true,
    "options": [
      "Phone",
      "Email"
    ],
    "default_value": "Email",
    "required": true,
  },
  "Contact-Address": {
    "display_name": "Contact address",
    "description": "Please enter the contact address",
    "type": "paragraph",
    "required": true,
    "secure": true
  },
  "Email-Address": {
    "display_name": "Email Address",
    "description": "Please enter your email address",
    "type": "email",
    "required": true,
    "secure": true,
  },
  "Phone-Number": {
    "display_name": "Phone Number",
    "description": "Please enter your phone number with the country code",
    "type": "phone_number",
    "required": true,
    "secure": true,
    "regex": {
      "regex1": "([0-9]{3}-[0-9]{3}-[0-9]{4})|([0-9]{10})",
      "regex1-error": "enter a valid phone number"
    }
  },
  "Birthday": {
    "display_name": "Birthday",
    "description": "Please enter your birthday",
    "type": "date",
    "required": true,
    "secure": true,
  },
  "FreshSales-Domain": {
    "display_name": "Freshdesk Domain",
    "type": "url",
    "required": false,
    "secure": false,
    "visible": false,
    "required": true,
    "regex": {
      "regex1": "http://www.{a-z}.freshsales.com",
      "regex1-error": "enter a domain"
    }
  },
  "Freshdesk-Domain": {
    "display_name": "Freshdesk Domain",
    "description": "Please enter your Freshdesk domain web address",
    "type": "url",
    "required": true,
    "secure": true,
  },
  "Contact-Type-radio": {
    "display_name": "Contact Type radio",
    "description": "Please select the contact type",
    "type": "radio",
    "options": [
      "Phone",
      "Email"
    ],
    "default_value": "Email",
    "secure": true,
    "required": true
  },
  "Archive-Ticket": {
    "display_name": "Archive ticket",
    "description": "Check this option if the tickets are to be archived",
    "type": "checkbox",
    "default_value": true,
    "required": true,
    "secure": true,
  },
  "Contact-Methods": {
    "display_name": "Contact Methods",
    "description": "Please select the preferred contact methods",
    "type": "multiselect",
    "visible": true,
    "required": true,
    "secure": true,
    "options": [
      "Phone",
      "Mobile",
      "Twitter ID",
      "Email"
    ],
    "default_value": ["Mobile", "Email"]
  },
  "domain_name": {
    "display_name": "Domain Name",
    "description": "Please enter domain name",
    "type": "domain",
    "type_attributes": {
      "product": "freshdesk",
    },
    "default_value": "",
    "required": true,
    "secure": false
  },
  "Api_key": {
    "display_name": "API Key",
    "description": "Please enter API key",
    "type": "api_key",
    "type_attributes": {
      "product": "freshdesk",
    },
    "required": true,
    "secure": true
  },
  "Contact-details": {
    "display_name": "Contact Methods",
    "description": "Please select the preferred contact methods",
    "type": "multiselect",
    "visible": true,
    "required": true,
    "secure": true,
    "options": [
      "Phone",
      "Mobile",
      "Twitter ID",
      "Email"
    ]
  },
};

function getFieldOptions(dataObj) {
  var custom_attributes = ['secure-iparam'];

  if (dataObj['data-bind']) {
    custom_attributes.push('bind');
  }

  const field_options = Object.assign({
    'fms_custom_attr': custom_attributes.toString(),
    'secure-iparam': dataObj.secure || false,
    'type_attributes': dataObj.type_attributes || null
  }, dataObj['data-bind'] ? {
    bind: dataObj['data-bind']
  } : {});

  return field_options;
}

function iparamToFormServJSON(iparams) {
  var result = {
    fields: []
  };

  Object.keys(iparams).forEach((key) => {
    var value = iparams[key];

    result.fields.push({
      'name': key,
      'label': value.display_name,
      'hint': value.description,
      'type': value.type,
      'default_value': value.default_value,
      'required': value.required,
      'regex': value.regex,
      'visible': value.visible === false ? false : true,
      'choices': value.options ? value.options.map((op) => {
        return {
          'value': op
        };
      }) : null,
      'field_options': getFieldOptions(value),
      'events': value.events
    });
  });
  return result;
}

function findTextAndReturn(target, variable) {
  var chopFront = target.substring(target.search(variable) + variable.length, target.length);
  var result = chopFront.substring(0, chopFront.search(";"));
  return result;
}


describe('FormService v2 without configs', () => {
  it('check config', function (done) {
    var formServiceHelper = new formService(config);

    formServiceHelper.getHtml().then((response) => {
      expect(response).equal('');
      done();
    });
  });
});

describe('FormService Tests', () => {
  var formServiceHelper = new formService(config);
  var $;
  var jsonObj;
  formServiceHelper.getHtml(iparamToFormServJSON(IPARAM_JSON), false).then((response) => {
    $ = cheerio.load(response);
    var text = $($('script')).text();
    jsonObj = JSON.parse(findTextAndReturn(text, "var formObjects ="));
    console.log(jsonObj);
  });


  it('check Form Id', function (done) {
    expect($('#iParamsFormId').length).equal(1);
    done();
  });

  it('check the textbox "contact"', function (done) {
    expect(jsonObj.model['Contact']).equal('');
    expect(jsonObj.fields[1].type).equal('input');
    expect(jsonObj.fields[0].inputType).equal('text');
    expect(jsonObj.fields[0].label).equal('Contact details');
    expect(jsonObj.fields[0].id).equal('Contact-id');
    expect(jsonObj.fields[0].inputName).equal('Contact');
    expect(jsonObj.fields[0].visible).equal(true);
    expect(jsonObj.fields[0].disabled).equal(false);
    expect(jsonObj.fields[0].required).equal(true);
    expect(jsonObj.fields[0].hint).equal('Please enter the contact details');
    expect(jsonObj.fields[0].pattern).equal('([a-z][A-Z])');
    expect(jsonObj.fields[0].errorMessage).equal('contact details should be only text');
    expect(JSON.stringify(jsonObj.fields[0].attributes.input)).equal(JSON.stringify({
      'data-secure-iparam': true
    }));
    done();
  });

  it('check the Number "Age"', function (done) {
    expect(jsonObj.model['Age']).equal('');
    expect(jsonObj.fields[1].type).equal('input');
    expect(jsonObj.fields[1].inputType).equal('number');
    expect(jsonObj.fields[1].label).equal('Age');
    expect(jsonObj.fields[1].id).equal('Age-id');
    expect(jsonObj.fields[1].inputName).equal('Age');
    expect(jsonObj.fields[1].visible).equal(true);
    expect(jsonObj.fields[1].disabled).equal(false);
    expect(jsonObj.fields[1].required).equal(true);
    expect(jsonObj.fields[1].hint).equal('Please enter your age in years');
    expect(JSON.stringify(jsonObj.fields[1].attributes.input)).equal(JSON.stringify({
      'data-secure-iparam': true
    }));
    done();
  });

  it('check the Dropdown "Contact-Type"', function (done) {
    expect(jsonObj.model['Contact-Type']).equal('Email');
    expect(jsonObj.fields[2].type).equal('select');
    expect(jsonObj.fields[2].label).equal('Contact Type');
    expect(jsonObj.fields[2].id).equal('Contact-Type-id');
    expect(jsonObj.fields[2].visible).equal(true);
    expect(jsonObj.fields[2].disabled).equal(false);
    expect(jsonObj.fields[2].required).equal(true);
    expect(jsonObj.fields[2].hint).equal('Please select the contact type');
    expect(JSON.stringify(jsonObj.fields[2].values)).equal(JSON.stringify(["Phone", "Email"]));
    done();
  });

  it('check the dropdown "Contact-Address"', function (done) {
    expect(jsonObj.model['Contact-Address']).equal('');
    expect(jsonObj.fields[3].type).equal('textArea');
    expect(jsonObj.fields[3].label).equal('Contact address');
    expect(jsonObj.fields[3].id).equal('Contact-Address-id');
    expect(jsonObj.fields[3].visible).equal(true);
    expect(jsonObj.fields[3].disabled).equal(false);
    expect(jsonObj.fields[3].required).equal(true);
    expect(jsonObj.fields[3].rows).equal(3);
    expect(jsonObj.fields[3].hint).equal('Please enter the contact address');
    expect(JSON.stringify(jsonObj.fields[3].attributes.input)).equal(JSON.stringify({
      'data-secure-iparam': true
    }));
    done();
  });

  it('check the email "Email Address"', function (done) {
    expect(jsonObj.model['Email-Address']).equal('');
    expect(jsonObj.fields[4].type).equal('input');
    expect(jsonObj.fields[4].inputType).equal('email');
    expect(jsonObj.fields[4].label).equal('Email Address');
    expect(jsonObj.fields[4].id).equal('Email-Address-id');
    expect(jsonObj.fields[4].inputName).equal('Email-Address');
    expect(jsonObj.fields[4].visible).equal(true);
    expect(jsonObj.fields[4].disabled).equal(false);
    expect(jsonObj.fields[4].required).equal(true);
    expect(jsonObj.fields[4].hint).equal('Please enter your email address');
    expect(JSON.stringify(jsonObj.fields[4].attributes.input)).equal(JSON.stringify({
      'data-secure-iparam': true
    }));
    done();
  });

  it('check the tel "Phone Number"', function (done) {
    expect(jsonObj.model['Phone-Number']).equal('');
    expect(jsonObj.fields[5].type).equal('input');
    expect(jsonObj.fields[5].inputType).equal('tel');
    expect(jsonObj.fields[5].label).equal('Phone Number');
    expect(jsonObj.fields[5].id).equal('Phone-Number-id');
    expect(jsonObj.fields[5].inputName).equal('Phone-Number');
    expect(jsonObj.fields[5].visible).equal(true);
    expect(jsonObj.fields[5].disabled).equal(false);
    expect(jsonObj.fields[5].required).equal(true);
    expect(jsonObj.fields[5].hint).equal('Please enter your phone number with the country code');
    expect(jsonObj.fields[5].pattern).equal('(([0-9]{3}-[0-9]{3}-[0-9]{4})|([0-9]{10}))');
    expect(jsonObj.fields[5].errorMessage).equal('enter a valid phone number');
    done();
  });

  it('check the Date "Birthday"', function (done) {
    expect(jsonObj.model['Birthday']).equal('');
    expect(jsonObj.fields[6].type).equal('date-picker');
    expect(jsonObj.fields[6].label).equal('Birthday');
    expect(jsonObj.fields[6].id).equal('Birthday-id');
    expect(jsonObj.fields[6].inputName).equal('Birthday');
    expect(jsonObj.fields[6].visible).equal(true);
    expect(jsonObj.fields[6].disabled).equal(false);
    expect(jsonObj.fields[6].required).equal(true);
    expect(jsonObj.fields[6].hint).equal('Please enter your birthday');
    done();
  });

  it('check the URL "FreshSales-Domain"', function (done) {
    expect(jsonObj.model['FreshSales-Domain']).equal('');
    expect(jsonObj.fields[7].type).equal('input');
    expect(jsonObj.fields[7].inputType).equal('url');
    expect(jsonObj.fields[7].label).equal('Freshdesk Domain');
    expect(jsonObj.fields[7].id).equal('FreshSales-Domain-id');
    expect(jsonObj.fields[7].inputName).equal('FreshSales-Domain');
    expect(jsonObj.fields[7].visible).equal(false);
    expect(jsonObj.fields[7].disabled).equal(false);
    expect(jsonObj.fields[7].required).equal(true);
    expect(jsonObj.fields[7].errorMessage).equal('enter a domain');
    expect(jsonObj.fields[7].pattern).equal('(http://www.{a-z}.freshsales.com)');
    done();
  });

  it('check the URL "Freshdesk-Domain"', function (done) {
    expect(jsonObj.model['Freshdesk-Domain']).equal('');
    expect(jsonObj.fields[8].type).equal('input');
    expect(jsonObj.fields[8].inputType).equal('url');
    expect(jsonObj.fields[8].label).equal('Freshdesk Domain');
    expect(jsonObj.fields[8].id).equal('Freshdesk-Domain-id');
    expect(jsonObj.fields[8].inputName).equal('Freshdesk-Domain');
    expect(jsonObj.fields[8].visible).equal(true);
    expect(jsonObj.fields[8].disabled).equal(false);
    expect(jsonObj.fields[8].required).equal(true);
    expect(jsonObj.fields[8].hint).equal('Please enter your Freshdesk domain web address');
    done();
  });

  it('check the Radio button "contact type"', function (done) {
    expect(jsonObj.model['Contact-Type-radio']).equal('Email');
    expect(jsonObj.fields[9].type).equal('radios');
    expect(jsonObj.fields[9].label).equal('Contact Type radio');
    expect(jsonObj.fields[9].id).equal('Contact-Type-radio-id');
    expect(jsonObj.fields[9].visible).equal(true);
    expect(jsonObj.fields[9].disabled).equal(false);
    expect(jsonObj.fields[9].required).equal(true);
    expect(jsonObj.fields[9].hint).equal('Please select the contact type');
    expect(JSON.stringify(jsonObj.fields[9].values)).equal(JSON.stringify(["Phone", "Email"]));
    done();
  });

  it('check the Checkbox "Archive ticket"', function (done) {
    expect(jsonObj.model['Archive-Ticket']).equal(true);
    expect(jsonObj.fields[10].type).equal('checkbox');
    expect(jsonObj.fields[10].label).equal('Archive ticket');
    expect(jsonObj.fields[10].id).equal('Archive-Ticket-id');
    expect(jsonObj.fields[10].visible).equal(true);
    expect(jsonObj.fields[10].disabled).equal(false);
    expect(jsonObj.fields[10].required).equal(true);
    expect(jsonObj.fields[10].hint).equal('Check this option if the tickets are to be archived');
    expect(jsonObj.fields[10].errorMessage).equal('This field is required!');
    done();
  });

  it('check the MultiSelect "Contact Methods"', function (done) {
    expect(JSON.stringify(jsonObj.model['Contact-Methods'])).equal(JSON.stringify(['Mobile', 'Email']));
    expect(jsonObj.fields[11].type).equal('vueMultiSelect');
    expect(jsonObj.fields[11].label).equal('Contact Methods');
    expect(jsonObj.fields[11].id).equal('Contact-Methods-id');
    expect(jsonObj.fields[11].visible).equal(true);
    expect(jsonObj.fields[11].disabled).equal(false);
    expect(jsonObj.fields[11].required).equal(true);
    expect(jsonObj.fields[11].hint).equal('Please select the preferred contact methods');
    expect(JSON.stringify(jsonObj.fields[11].values)).equal(JSON.stringify(["Phone", "Mobile", "Twitter ID", "Email"]));
    done();
  });

  it('check the domain "domain name"', function (done) {
    expect(jsonObj.model['domain_name']).equal('');
    expect(jsonObj.fields[12].type).equal('domain');
    expect(jsonObj.fields[12].label).equal('Domain Name');
    expect(jsonObj.fields[12].id).equal('domain_name-id');
    expect(jsonObj.fields[12].inputName).equal('domain_name');
    expect(jsonObj.fields[12].visible).equal(true);
    expect(jsonObj.fields[12].disabled).equal(false);
    expect(jsonObj.fields[12].required).equal(true);
    expect(jsonObj.fields[12].hint).equal('Please enter domain name');
    expect(jsonObj.fields[12].dataType).equal('domain');
    expect(jsonObj.fields[12].errorMessage).equal('This field is required!');
    expect(jsonObj.fields[12].productName).equal('freshdesk');
    done();
  });

  it('check the api_key "Api key"', function (done) {
    expect(jsonObj.model['Api_key']).equal('');
    expect(jsonObj.fields[13].type).equal('input');
    expect(jsonObj.fields[13].inputType).equal('text');
    expect(jsonObj.fields[13].label).equal('API Key');
    expect(jsonObj.fields[13].id).equal('Api_key-id');
    expect(jsonObj.fields[13].inputName).equal('Api_key');
    expect(jsonObj.fields[13].visible).equal(true);
    expect(jsonObj.fields[13].disabled).equal(false);
    expect(jsonObj.fields[13].required).equal(true);
    expect(jsonObj.fields[13].hint).equal('Please enter API key');
    expect(jsonObj.fields[13].dataType).equal('api_key');
    expect(jsonObj.fields[13].productName).equal('freshdesk');
    expect(jsonObj.fields[13].errorMessage).equal('This field is required!');
    done();
  });

  it('check the MultiSelect "Contact-details"', function (done) {
    expect(JSON.stringify(jsonObj.model['Contact-details'])).equal(JSON.stringify([]));
    expect(jsonObj.fields[14].type).equal('vueMultiSelect');
    expect(jsonObj.fields[14].label).equal('Contact Methods');
    expect(jsonObj.fields[14].id).equal('Contact-details-id');
    expect(jsonObj.fields[14].visible).equal(true);
    expect(jsonObj.fields[14].disabled).equal(false);
    expect(jsonObj.fields[14].required).equal(true);
    expect(jsonObj.fields[14].hint).equal('Please select the preferred contact methods');
    expect(JSON.stringify(jsonObj.fields[14].values)).equal(JSON.stringify(["Phone", "Mobile", "Twitter ID", "Email"]));
    done();
  });
});
