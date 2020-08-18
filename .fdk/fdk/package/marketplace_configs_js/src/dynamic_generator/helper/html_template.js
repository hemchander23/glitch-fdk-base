const htmlTemplate =
  `<!doctype html>
    <html lang="en">
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <link rel="stylesheet" href="https://unpkg.com/vue-form-generator@2.3.4/dist/vfg.css">
        <link rel="stylesheet" href="https://unpkg.com/vue-multiselect@2.1.0/dist/vue-multiselect.min.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr@4/dist/flatpickr.min.css">
        <%= CSS %>
      </head>
      <body>
        <form id="iParamsFormId">
          <div class="container-fluid">
            <vue-form-generator :schema="schema" :model="model" :options="formOptions"
                                @validated="onValidate" ref="formElements">
            </vue-form-generator>
          </div>
        </form>
        <script>
          var formObjects = <%= formObjects %>;
        </script>
        <script src="https://unpkg.com/vue@2.5.17/dist/vue.min.js"></script>
        <script src="https://unpkg.com/vue-form-generator@2.3.4/dist/vfg.js"></script>
        <script src="https://unpkg.com/vue-multiselect@2.1.0/dist/vue-multiselect.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/flatpickr@4/dist/flatpickr.min.js"></script>
        <%= javascript %>
      </body>
    </html>`;

module.exports = htmlTemplate;
