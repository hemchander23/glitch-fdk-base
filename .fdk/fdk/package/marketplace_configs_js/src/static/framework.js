import domain from './components/domain';
import datePicker from './components/datePicker';
import authmixin from './authMixin';

const FUNCTION = 'function';
const MOUNTED = 'onFormLoad';
const DESTROYED = 'onFormUnload';
const DEBOUNCE_TIME = 300;
// eslint-disable-next-line no-magic-numbers
const VUE_DEBOUNCE_TIME = DEBOUNCE_TIME + 1500;

window.Vue.use(window.VueFormGenerator, {
  validators: {
    customError(value, field) {
      const element = document.getElementById(field.id);

      if (element && !element.checkValidity()) {
        return [field.userErrorMessage || (field.errorMessage || '')];
      }
    }
  }
});

window.Vue.component('multiselect', window.VueMultiselect.default);
window.Vue.component('field-domain', domain);
window.Vue.component('field-date-picker', datePicker);

function setCustomValidity(element, value) {
  if (element) {
    element.setCustomValidity(value);
  }
}

function debounce(func, delay) {
  let debounceTimer = null;

  return function () {
    const context = this;
    const args = arguments;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

function setValidation(errorMessage, field) {
  const status = errorMessage ? 'Invalid field' : '';

  setCustomValidity(document.getElementById(field.id), status);
  field.userErrorMessage = errorMessage;
}

/**
 * map the events from form objects to vue form generator schema
 * @param {string} functionName - callback function name of the event
 * @param {string} event - event name
 */
function getEventMappings(functionName, event) {
  const eventMappings = {
    change: {
      onChanged: debounce((model, newVal, oldval, field) => {
        if (typeof window[functionName] === FUNCTION) {
          const result = window[functionName](newVal);

          Promise.resolve(result).then(value => {
            setValidation(value, field);
          }).catch(ex => {
            setValidation(ex, field);
          });
        } else {
          // eslint-disable-next-line no-console
          console.log('Function does not exist:', functionName);
        }
      }, DEBOUNCE_TIME)
    }
  };

  return eventMappings[event];
}

// map events to schema
window.formObjects.fields.forEach(node => {
  const events = node.events;

  for (const elm in events) {
    const functionName = events[elm];

    node = Object.assign(node, getEventMappings(functionName, elm));
  }
  return node;
});

window.viewModel = new window.Vue({
  el: '#iParamsFormId',
  components: {
    'vue-form-generator': window.VueFormGenerator.component
  },
  mixins: [authmixin],
  data() {
    return {
      META: '__meta',
      SECURE: 'secure',
      SUCCESS: 200,
      model: window.formObjects.model,
      schema: {
        fields: window.formObjects.fields
      },
      formOptions: {
        validateAfterChanged: true,
        validateAsync: true,
        validateDebounceTime: VUE_DEBOUNCE_TIME
      },
      isValid: false,
      client: null
    };
  },
  created() {
    window.app.initialized().then((_client) => {
      this.client = _client;
    });
  },
  mounted() {
    document.onreadystatechange = () => {
      if (document.readyState === 'complete') {
        if (typeof window[MOUNTED] === FUNCTION) {
          window[MOUNTED]();
        }
      }
    };
    // destroy or before destroy life cycle events on Vue not able to use if user closed the Iparams,
    // so added the javascript unload function
    window.onbeforeunload = () => {
      if (typeof window[DESTROYED] === FUNCTION) {
        window[DESTROYED]();
      }
    };
  },
  methods: {
    onValidate(isValid) {
      this.isValid = isValid;
    },

    focusElement(element) {
      if (element) {
        element.focus();
      }
    },

    /**
     * check the form is valid or not
     * @return {Promises} promise object that resolves with true/false
     */
    validate() {
      return new Promise(resolve => {
        this.validateDomainAPI().then((value) => {
          const isValidAPI = value.every((result) => {
            return result;
          });

          this.$refs.formElements.validate().then(errors => {
            if (errors.length > 0) {
              const elementId = errors[0].field.id;

              this.focusElement(document.getElementById(elementId));
            }
            resolve(isValidAPI && errors.length === 0);
          });
        });
      });
    },

    /**
     * get configs from storage to model
     * @params iparam values (key value pair)
     */
    getConfigs(value) {
      for (const key in this.model) {
        this.model[key] = value[key];
      }
    },

    /**
     * post config to storage
     * @returns {object} iparam values (key value pair)
     */
    postConfigs() {
      // To omit the framework get and set function for each model, stringify and parse to get the JSON value
      const result = JSON.parse(JSON.stringify(this.model));

      const secureIparams = this.schema.fields.filter((value) => {
        return value.visible && value.attributes.input['data-secure-iparam'];
      }).map(value => value.model);

      if (secureIparams.length > 0) {
        return Object.assign({
          [this.META]: {
            [this.SECURE]: secureIparams
          }
        }, result);
      }

      return result;
    }
  }
});
