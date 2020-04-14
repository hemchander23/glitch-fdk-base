function getValidation({ type, regex }) {
  const validator = ['customError'];

  // type dropdown,radio,number,multiselect doesn't support regex so it will add by default
  const validateTypes = {
    text: 'string',
    paragraph: 'string',
    dropdown: 'string',
    radio: 'string',
    email: 'email',
    date: 'date',
    url: 'url',
    number: 'number',
    multiselect: 'array'
  };
  const value = validateTypes[type];

  if (!regex && value) {
    validator.push(value);
  }
  return validator;
}

function getCustomFields(fields) {
  const returnFields = {};

  const customAttr = fields.fms_custom_attr.split(',');

  customAttr.forEach(value => {
    returnFields[`data-${value}`] = fields[value];
  });
  return returnFields;
}

function getCustomValidation(regex = {}) {
  const pattern = [],
    errorMessage = [];

  for (const key in regex) {
    if (key.includes('-error')) {
      errorMessage.push(regex[key]);
    } else {
      pattern.push('(' + regex[key] + ')');
    }
  }

  if (pattern.length > 0) {
    return {
      pattern: pattern.join('|'),
      errorMessage: errorMessage.join('/')
    };
  }
  return {};
}

function getOptions(choices) {
  return choices.map(option => {
    return option.value;
  });
}

function getCallbackEvents(params = []) {
  const events = {};

  params.forEach(node => {
    const key = Object.keys(node)[0];

    events[key] = node[key];
  });

  return { events };
}

module.exports = {
  getCustomFields,
  getCustomValidation,
  getValidation,
  getOptions,
  getCallbackEvents
};
