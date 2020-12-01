$(document).ready( function() {
    app.initialized()
        .then(function(_client) {
          var client = _client;
          client.events.on('app.activated',
            function() {
                client.data.get('requester')
                    .then(function(data) {
                        $('#apptext').text("Ticket created by " + data.requester.name);
                    })
                    .catch(function(e) {
                        console.log('Exception - ', e);
                    });
        });
    });
});
