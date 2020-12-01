var client;

isDocumentReady();

function startAppRender() {
  app
    .initialized()
    .then(function(_client) {
      client = _client;
      client.events.on('app.activated', renderCustomerName);
    })
    .catch(errorHandler);
}

function renderCustomerName() {
  var textElement = document.getElementById('apptext');
  client.data
    .get('user')
    .then(function({ user: { first_name } }) {
      textElement.innerHTML = `Data Method returned with customer name: ${first_name}`;
    })
    .catch(errorHandler);
}

function errorHandler(err) {
  console.error(`App failed to initialize because...`);
  console.error(err);
}

function isDocumentReady() {
  if (document.readyState != 'loading') {
    console.info('There is an error in rendering the app!');
  } else {
    document.addEventListener('DOMContentLoaded', startAppRender);
  }
}
