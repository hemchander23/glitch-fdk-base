$(document).ready( function() {
    app.initialized()
        .then(function(_client) {
          var client = _client;
          client.events.on('app.activated',
            function() {
                client.data.get('loggedInUser')
                    .then(function(data) {
                        $('#apptext').text("Agent logged in is " + data.loggedInUser.email);
                    })
                    .catch(function(e) {
                        console.log('Exception - ', e);
                    });
        });
    });
});
