const helper = require('../helper/element_helper');

function create(element) {
  return {
    type: 'input',
    inputType: 'number',
    label: element.label,
    model: element.name,
    id: `${element.name}-id`,
    inputName: element.name,
    visible: element.visible,
    min: element.min,
    max: element.max,
    disabled: element.disabled || false,
    required: element.required,
    default: element.default_value,
    hint: element.hint,
    validator: helper.getValidation(element),
    attributes: {
      input: helper.getCustomFields(element.field_options)
    },
    ...helper.getCallbackEvents(element.events)
  };
}

module.exports = create;
