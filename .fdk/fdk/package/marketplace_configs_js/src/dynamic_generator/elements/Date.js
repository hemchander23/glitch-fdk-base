const helper = require('../helper/element_helper');

function create(element) {
  return {
    type: 'date-picker',
    label: element.label,
    model: element.name,
    id: `${element.name}-id`,
    inputName: element.name,
    placeholder: 'yyyy-mm-dd',
    visible: element.visible,
    disabled: element.disabled || false,
    required: element.required,
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
