$(document).ready( function() {
    app.initialized()
        .then(function(_client) {
          var client = _client;
      client.interface.trigger("showNotify", {
        type: "success",
        message: "sample notification"
      /* The "message" should be plain text */
      }).then(function(data) {
      // data - success message
      }).catch(function(error) {
      // error - error object
      });
          client.events.on('app.activated',
            function() {
                client.data.get('loggedInAgent')
                    .then(function(data) {
                        $('#apptext').text("We have an agent logged in and it iss: " + data.loggedInAgent.email);
                    })
                    .catch(function(e) {
                        console.log('Exception - ', e);
                    });
        });
    });
});
