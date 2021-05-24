document.onreadystatechange = function() {
  if (document.readyState === 'interactive') renderApp();

  function renderApp() {
    var onInit = app.initialized();

    onInit
      .then(function getClient(_client) {
        window.client = _client;
        client.events.on('app.activated', renderContactName);
      })
      .catch(handleErr);
  }
};

function renderContactName() {
  var textElement = document.getElementById('apptext');
  client.data
    .get('requester')
    .then(function(payload) {
      textElement.innerHTML = `Data Method returned: ${payload.requester.name}`;
    })
    .catch(handleErr);
}

function handleErr(err = 'None') {
  console.error(`Error occured. Details:`, err);
}
