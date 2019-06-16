exports = {

  events: [
    { event: 'testEvent', callback: 'onTicketCallback' }
  ],

  callRemote: function(args) {
    console.log(args);
    renderData();
  },

  // args is always a JSON block.
  // args['iParams'] wil give the account specific installation param values.
  onTicketCallback: function(args) {
    console.log(args);
    renderData();
  }

};