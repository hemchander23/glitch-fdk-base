const helper = require('../helper/element_helper');

function create(element) {
  return {
    type: 'input',
    inputType: 'text',
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
    ...helper.getCustomValidation(element.regex),
    ...helper.getCallbackEvents(element.events)
  };
}

module.exports = create;
