exports = {

  events: [
    { event: 'onEmployeeCreate', callback: 'onEmployeeCreateHandler' }
  ],

  // args is a JSON block containing the payload information.
  // args['iparam'] will contain the installation parameter values.
  onEmployeeCreateHandler: function(args) {
    console.log('Hello ' + args['data']['user']['user_emails'][0]);
  }

};
