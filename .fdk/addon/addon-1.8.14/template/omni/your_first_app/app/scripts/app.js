var client;

isDocumentReady();

function startAppRender() {
  app.initialized().then(function(_client) {
    client = _client;
    client.events.on('app.activated', appLogic);
  });
}

function appLogic() {
  var btn = document.querySelector('.btn-open');
  btn.addEventListener('click', openModal);
  // Start writing your code...
}

function openModal() {
  client.interface.trigger(
    'showModal',
    useTemplate('Add Integration Action', './views/modal.html')
  );
}

function useTemplate(title, template) {
  return {
    title,
    template
  };
}

function isDocumentReady() {
  if (document.readyState != 'loading') {
    console.info('Scripts are deferred or loading async');
    startAppRender();
  } else {
    document.addEventListener('DOMContentLoaded', startAppRender);
  }
}
