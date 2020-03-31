var a =  loadDependency('request');

exports = {

  events: [
    { event: 'onConversationCreate', callback: 'onTicketCallback' }
  ],

  // args is always a JSON block.
  // args['iParams'] wil give the account specific installation param values.
  onTicketCallback: function(args) {
    console.log(args);
  }

};