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
        <div class="input-group-addon">{{productName}}</div>
      </div>
    </div>
`,
  mixins: [window.VueFormGenerator.abstractField],
  computed: {
    productName() {
      return `.${this.schema.productName}.${this.schema.productName === 'freshsales'? 'io': 'com'}`;
    }
  },
  methods: {
    onInput($event) {
      const value = $event.target.value;

      this.value = value;
    }
  }
});

module.exports = domain;
