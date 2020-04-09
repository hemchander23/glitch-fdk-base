'use strict';

const quick_templates = {
  oauth_template: `$(document).ready( function() {
        app.initialized()
            .then(function(_client) {
              var client = _client;
              window.cl = _client;
              client.events.on('app.activated',
                function() {
                    var path = '/',
                      headers = { Authorization: 'bearer <%= access_token %>'},
                      reqData = { headers: headers, isOAuth: true },
                      url = '<--provide the url -->';

                  client.request.get(url, reqData)
                  .then(function(data) {
                       //Put your code here.
                  });
            });
        });
    });`,

  external_events_template: `var APP_REGISTRATION_ERR = 'App registration failed';
    var APP_DEREGISTRATION_ERR = 'App deregistration failed';

    exports = {

      events: [
        { event: 'onAppInstall', callback: 'onInstallHandler' },
        { event: 'onAppUninstall', callback: 'onUnInstallHandler' },
        { event: 'onExternalEvent', callback: 'onWebhookCallbackHandler'}
      ],

      /**
       * onAppInstall:
       * Webhook url is created through generateTargetUrl function
       * On successful registration, the id is stored using $db
       */
      onInstallHandler: function(args) {
        generateTargetUrl().done(function(targetUrl) {
        })
        .fail(function(){
          renderData({ message: APP_REGISTRATION_ERR });
        });
      },

      /**
       * onAppUninstall:
       * Get the webhook id from database through $db that was stored during installation
       */
      onUnInstallHandler: function(args) {
        $db.get('jiraWebhookId').done(function(data){

        })
        .fail(function(){
          renderData({ message: APP_DEREGISTRATION_ERR });
        });
      },

      /**
       * onExternalEvent:
       */
      onWebhookCallbackHandler: function(args) {

      }
    };`,

  iparams_html: `<html>
<head>
  <title><%= pageTitle %></title>
  <%= product %>
  <%= iparamcss %>
  <style>
  /* Put your custom style here */
  </style>
</head>
<body>
<div class='form'>
  <form>
    <input type='text' name='field1' placeholder='Your Name' />
    <input type='email' name='field2' placeholder='Email Address' />
  </form>
</div>
<%= jquery %>
<%= client %>
<%= iparamjs %>
<script type= "text/javascript">
function getConfigs(configs) {
  //write your code here
};

function validate() {
  let isValid = true;
  //write your code here
  return isValid;
};

function postConfigs() {
  //write your code here
};
</script>
</body>
</html>`,

  serverTemplate: `exports = {

events: [
<% _.forEach(events, function(event) { %><%= event %><% }); %>
],

<% _.forEach(eventFunctions, function(func) { %><%= func%><% }); %>

};`



};



module.exports = quick_templates;
