const helper = require('../helper/element_helper');

function create(element) {
  return {
    type: 'checkbox',
    label: element.label,
    model: element.name,
    id: `${element.name}-id`,
    visible: element.visible,
    disabled: element.disabled || false,
    required: element.required,
    default: element.default_value,
    hint: element.hint,
    validator: helper.getValidation(element),
    attributes: {
      input: helper.getCustomFields(element.field_options)
    },
    errorMessage: 'This field is required!',
    ...helper.getCallbackEvents(element.events)
  };
}

module.exports = create;
