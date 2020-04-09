const helper = require('../helper/element_helper');

function create(element) {
  return {
    type: 'domain',
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
    dataType: 'domain',
    productName: element.field_options.type_attributes.product,
    attributes: {
      input: {
        ...helper.getCustomFields(element.field_options)
      }
    },
    errorMessage: 'This field is required!',
    ...helper.getCallbackEvents(element.events)
  };
}

module.exports = create;
