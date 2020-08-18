const datePicker = window.Vue.component('datePicker', {
  template: `
        <input
            type="text"
            class="form-control"
            :id="schema.id"
            :name="schema.inputName"
            :required="schema.required"
            v-attributes="'input'"
            @input="onInput"
            :value="value"
            @change="schema.onChange || null"
            :disabled="disabled"
            autocomplete="off"
            :formaction="schema.formaction"
            :formnovalidate="schema.formnovalidate"
            :formmethod="schema.formmethod"
            :formtarget="schema.formtarget"
            placeholder="yyyy-mm-dd"/>
`,
  mixins: [window.VueFormGenerator.abstractField],
  data() {
    return {
      fp: null
    };
  },
  mounted() {
    if (this.fp) {
      return;
    }
    // eslint-disable-next-line
    this.fp = new window.flatpickr(this.$el, {});

    this.$el.removeAttribute('readonly');
  },
  watch: {
    value(newValue) {
      // Prevent updates if v-model value is same as input's current value
      if (newValue === this.$el.value) {
        return;
      }
      // Make sure we have a flatpickr instance
      if (this.fp) {
        // Notify flatpickr instance that there is a change in value
        this.fp.setDate(new Date(newValue), true);
      }
    }
  },
  methods: {
    onInput($event) {
      const value = $event.target.value;

      this.value = value;
    }
  }
});

module.exports = datePicker;
