const CURRENT_PRODUCT = 'current';
const FCRM = 'freshworks_crm';
const domain = window.Vue.component('domain', {
  template: `
    <div class="wrapper">
      <div class="input-group">
          <div class="input-group-addon">https://</div>
          <input
            type="text"
            class="form-control"
            :id="schema.id"
            :name="schema.inputName"
            :required="schema.required"
            v-attributes="'input'"
            :value="value"
            @input="onInput"
            @change="schema.onChange || null"
            :disabled="disabled"
            :autocomplete="schema.autocomplete"
            :formaction="schema.formaction"
            :formnovalidate="schema.formnovalidate"
            :formmethod="schema.formmethod"
            :formtarget="schema.formtarget"
            :name="schema.inputName">
          <div v-if="isFCRMdropDown" class="input-group-btn" :class="{ 'open': isDropdownOpen }">
            <button type="button" class="btn btn-default dropdown-toggle"
              ref="dropdown" @click="toggleDropdown">
              .{{schema.productURL}}
              <span class="caret"></span>
            </button>
            <ul class="dropdown-menu dropdown-menu-right">
              <li v-for="value in productMapping.freshworks_crm">
                <a @click="changeProductURL(value)">{{value}}</a>
              </li>
            </ul>
          </div>
          <div v-else class="input-group-addon">.{{schema.productURL}}</div>
      </div>
    </div>
`,
  mixins: [window.VueFormGenerator.abstractField],
  data() {
    return {
      isDropdownOpen: false,
      context: '',
      productMapping: {
        freshdesk: 'freshdesk.com',
        freshservice: 'freshservice.com',
        freshsales: 'freshsales.io',
        freshchat: 'freshchat.com',
        freshcaller: 'freshcaller.com',
        freshteam: 'freshteam.com',
        freshworks_crm: {
          myfreshworks: 'myfreshworks.com',
          freshworks: 'freshworks.com'
        }
      },
       /* eslint-disable-next-line */
      regexURL: '^(http:\/\/|https:\/\/)?([a-zA-Z0-9-]+)+([.]{1})+([a-z]+)\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$'
    };
  },
  computed: {
    isFCRMdropDown() {
      const pName = this.schema.productName;

      return this.context.product !== FCRM && pName === FCRM;
    },

    isFCRM() {
      const pName = this.schema.productName;

      return this.context.product === FCRM && (pName === CURRENT_PRODUCT || pName === FCRM);
    }
  },

  watch: {
    value(newval, oldVal) {
      // Note: To support data bind in domain type, need to trim the subdomain part by using the regex.
      const regex = new RegExp(this.regexURL);

      if (newval !== oldVal && regex.test(newval)) {
        this.value = regex.exec(newval)[2];
      }
    }
  },

  created() {
    window.app.initialized().then((_client) => {
      this.context = _client.context;
      this.schema.productURL = this.getProductURL();
    });
  },

  mounted() {
    document.addEventListener('click', this.documentClick);
  },

  destroyed() {
    document.removeEventListener('click', this.documentClick);
  },

  methods: {
    onInput($event) {
      const value = $event.target.value;

      this.value = value;
    },

    documentClick(e) {
      const el = this.$refs.dropdown;
      const { target } = e;

      if (el && (el !== target) && !el.contains(target)) {
        this.isDropdownOpen = false;
      }
    },

    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },

    changeProductURL(productURL) {
      this.schema.productURL = productURL;
      this.toggleDropdown();
    },

    getProductURL() {
      const pName = this.schema.productName;

      // if the product is FCRM and type_attribute is current or FCRM get the URL from product context
      if (this.isFCRM) {
        const regex = new RegExp(this.regexURL);
        // if the product URL is not available for FCRM (local testing) then fallback to myfreshworks.com
        const productURL = regex.test(this.context.productContext.url) ? regex.exec(this.context.productContext.url)[4] : 'myfreshworks';

        return this.productMapping.freshworks_crm[productURL];
      } else if (this.isFCRMdropDown) {
        // if the product is non FCRM and the type_attribute is FCRM, get the myfreshworks.com by default.
        return this.productMapping.freshworks_crm.myfreshworks;
      }
      // for other product get it from the mapping.
      return pName === CURRENT_PRODUCT ?
        this.productMapping[this.context.product] : this.productMapping[pName];
    }
  }
});

module.exports = domain;
