const helper = require('./lib/helper');

exports = {
  events: [
    { event: "onCallCreate", callback: "onCallCreateHandler" }
  ],

  /**
   * This method handles the event that gets triggered when a call begins.
   *
   * @param {Object} payload
   */
  onCallCreateHandler: function (payload) {
    helper.logInfo('Call assigned to ' + payload['data']['call']['assigned_agent_id'])
  }
}
