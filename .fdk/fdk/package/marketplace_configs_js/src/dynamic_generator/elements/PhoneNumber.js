const helper = require('../helper/element_helper');

function getCustomValidation(regex) {
  const validate = helper.getCustomValidation(regex);

  if (Object.keys(validate).length > 0 && validate.constructor === Object) {
    return validate;
  }

  return {
    pattern: '([0-9]{3}-[0-9]{3}-[0-9]{4})|([0-9]{10})',
    errorMessage: 'Invalid format!. It should be a 10 digit number such as 1234567890 or 123-456-7890.'
  };
}

function create(element) {
  return {
    type: 'input',
    inputType: 'tel',
    label: element.label,
    model: element.name,
    id: `${element.name}-id`,
    inputName: element.name,
    visible: element.visible,
    disabled: element.disabled || false,
    required: element.required,
    default: element.default_value,
    hint: element.hint,
    validator: helper.getValidation(element),
    attributes: {
      input: helper.getCustomFields(element.field_options)
    },
    ...getCustomValidation(element.regex),
    ...helper.getCallbackEvents(element.events)
  };
}

module.exports = create;
