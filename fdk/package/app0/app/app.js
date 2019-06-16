$(document).ready( function() {
    app.initialized()
        .then(function(_client) {
          var client = _client;
          client.events.on('app.activated',
            function() {
                client.data.get('loggedInAgent)
                    .then(function(data) {
                        $('#apptext').text("Agent logged in is " + data.loggedInAgentemail);
                    })
                    .catch(function(e) {
                        console.log('Exception - ', e);
                    });
        });
    });
});
