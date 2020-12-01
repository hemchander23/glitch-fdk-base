$(document).ready( function() {
    app.initialized()
        .then(function(_client) {
          var client = _client;
          client.events.on('app.activated',
            function() {
                client.data.get('loggedInAgent')
                    .then(function(data) {
                        $('#apptext').text("Agent logged in is " + data.email);
                    })
                    .catch(function(e) {
                        console.log('Exception - ', e);
                    });
        });
    });
});
