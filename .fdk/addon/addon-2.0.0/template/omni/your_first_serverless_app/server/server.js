exports = {
  // args is a JSON block containing the payload information.
  // args['iparam'] will contain the installation parameter values.
  onLeadCreateHandler: function(args) {
    console.log('Hello ' + args['data']['lead']['email']);
  },

  onContactCreateHandler: function(args) {
    console.log('Hello ' + args['data']['actor']['email']);
  }
};
