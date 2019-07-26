/**
 * @desc - Sample App shows fectching Contact from Data API and shows on Ticket
 * sidebar
 */
$(document).ready(() => {
  app.initialized().then((_client) => { // Client Object is obtained
    const client = _client;
    /**
     * app.activated() is bought into scope, and timing differs
     * based on the location of the app in the FreshProduct.
     */
    client.events.on('app.activated', () => {
      /**
       * Making an Asyc call to Data API and feching the details from
       * the current ticket Payload.
       * @info - https://developers.freshdesk.com/v2/docs/data-api/#contactAPI
       */
      client.data.get('contact').then(function(data) {
        $('#apptext').text("Ticket created by "+ data.contact.name);
      }).catch((e) => { 
        console.log('Exception -',e);
      }); 
      client.interface.trigger("showConfirm", {
        title: "Sample Confirm",
        message: "Do you want to save the changes?", saveLabel: "save", cancelLabel: "ignore"
        /*"title" and "message" should be plain text.*/
      }).then(function(result) {
        /* "result" will be either "save" or "ignore" */
        console.log(result);
      }).catch(function(error) {
        // error - error object;
      });
    });
  });
});
