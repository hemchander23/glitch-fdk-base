var handlerViaLoadLib = loadLib('./lib/handle-response');
var handlerViaRequire = require('./lib/handle-response');

exports = {

  events: [
    { event: 'onAppInstall', callback: 'onAppInstallCallback' },
    { event: 'onAppUninstall', callback: 'onAppUninstallCallback' },
    { event: 'onTicketCreate', callback: 'onTicketCallback' },
    { event: 'onExternalEvent', callback: 'onTicketCallback' },
    { event: 'onTicketUpdate', callback: 'onTicketCallback' },
    { event: 'onConversationCreate', callback: 'onTicketCallback' },
    { event: 'onScheduledEvent', callback: 'onScheduledEvent' }
  ],

  onAppUninstallCallback: function(args) {
    console.log('App uninstall funciton invoked');
    renderData({message: 'from app uninstall'})
  },

  onAppInstallCallback: function(args) {
    console.log('App install funciton invoked');
    renderData(null, {message: 'from app install'});
  },

  callRemote: function(args) {
    console.log(args);
    console.log(`{print current directory ${process.cwd()}}`);
    renderData();
  },

  // args is always a JSON block.
  // args['iParams'] wil give the account specific installation param values.
  onTicketCallback: function(args) {
    console.log(args);
    generateTargetUrl("abcd")
    .done(function(data) {
      console.log("Target url created " + data);
    })
    .fail(function(err) {
      console.log("Error while generating target url " + JSON.stringify(err));
    });

    generateTargetUrl({})
    .done(function(data) {
      console.log("Target url created " + data);
    })
    .fail(function(err) {
      console.log("Error while generating target url " + JSON.stringify(err));
    });
    renderData();
  },

  onScheduledEvent: function(args) {
    console.log("Received scheduled event");
  },

  smiCustomInstall: function(args) {
    $db.get('test', function() {
      renderData();
    });
  }
};
