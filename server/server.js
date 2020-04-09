exports = {

  events: [
    { event: 'onExternalEvent', callback: 'onExternalEventCallback' }
  ],

  // args is a JSON block containing the payload information.
  // args['iparam'] will contain the installation parameter values.
  onExternalEventCallback: function(args) {
    console.log(args);
  }
  
  
};