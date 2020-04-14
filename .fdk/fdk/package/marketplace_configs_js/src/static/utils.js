const VALID_ATTRIBUTES = ['visible', 'disabled', 'required', 'values', 'hint', 'label', 'min', 'max'];

export default class utils {
  /**
   * get the value from the element
   * @param {String} fieldName - element fieldName mentioned as key in iparams
   * @returns current value of the field
   */
  static get(fieldName) {
    return window.viewModel.model[fieldName];
  }

  /**
   * set the value to the element
   * @param {String} fieldName - element fieldName mentioned as key in iparams
   * @param {Object} options - options to set eg: set('field_name', { value: 'sample'});
   */
  static set(fieldName, options = {}) {
    for (const key in options) {
      if (key === 'value') {
        window.viewModel.model[fieldName] = options[key];
      } else if (VALID_ATTRIBUTES.includes(key)) {
        this.getSchema(fieldName)[key] = options[key];
      }
    }
  }

  static getSchema(fieldName) {
    const result = window.viewModel.schema.fields.filter(element => element.model === fieldName);

    if (result.length > 0) {
      return result[0];
    }
    return {};
  }
}
