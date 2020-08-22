'use strict';

/* eslint-disable no-undef */

const eventListTimeout = 3000;
const SIMULATE_BUTTON_TIMEOUT = 2000;
const MONACO_MODEL_MARKER_UPDATE = 700;
const INTERNAL_SERVER_ERROR_STATUS = 500;
const list = ['events', 'actions'];
var modelURI;
var products = {};

function ajaxRequest(options, callback) {
  jQuery.ajax(options)
    .done(function(data, textStatus, xhr) {
      callback(null, data, xhr);
    })
    .fail(function(xhr, error) {
      callback(error, null, xhr);
    });
}

function resetSimulateButton() {
  setTimeout(function() {
    jQuery('#simulate-event').html('Simulate');
    jQuery('#simulate-event').attr('disabled', false);
  }, SIMULATE_BUTTON_TIMEOUT);
}

function displayPayload(name, type) {
  var url;

  if (type === 'actions') {
    url = 'http://localhost:10001/web/actions/' + name;
  }
  else {
    url = 'http://localhost:10001/web/events/' + name;
  }
  jQuery('#editor-btns').show();

  jQuery.get(url, function(data) {
    var value = data;
    var diagnosticOptions = {};

    if (type === 'actions') {
      diagnosticOptions = {
        validate: true,
        schemas: [{
          fileMatch: [modelURI.toString()],
          schema: data.schema
        }]
      };
      value = data.value;
    }

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions(diagnosticOptions);
    monaco.editor.getModel(modelURI).setValue(JSON.stringify(value, null, 2));
  });
}

function showEditor(value, type) {
  if (typeof editor === 'undefined') {
    require.config({
      paths: {
        vs: 'http://dl.freshdev.io/sdk-packages/monaco-editor/0.15.6/min/vs'
      }
    });
    require(['vs/editor/editor.main'], function() {
      modelURI = monaco.Uri.parse('a://b/foo.json');
      var model = monaco.editor.createModel('', 'json', modelURI);

      monaco.editor.defineTheme('redMarkerTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editorWarning.foreground': 'FF0000'
        }
      });

      window.editor = monaco.editor.create(document.getElementById('monaco-container'), {
        language: 'json',
        fontSize: 12,
        model: model,
        theme: 'redMarkerTheme'
      });
      monaco.editor.getModel(modelURI).updateOptions({
        tabSize: 2
      });
      monaco.editor.getModel(modelURI).onDidChangeContent(() => {
        setTimeout(function() {
          var modelMarkers = window.monaco.editor.getModelMarkers({});

          if (modelMarkers.length > 0) {
            jQuery('#simulate-event').attr({
              'title' : 'Errors while validating payload',
              'disabled': true
            });
          }
          else {
            jQuery('#simulate-event').html('Simulate');
            jQuery('#simulate-event').attr({
              'title' : '',
              'disabled' :false
            });
          }
        }, MONACO_MODEL_MARKER_UPDATE);
      });
      jQuery('.box').css('height', '780px');
      displayPayload(value, type);
    });
  }
  else {
    displayPayload(value, type);
  }
}

function showError(xhr) {
  jQuery('#simulate-event').html('<i class="fa fa-times" aria-hidden="true" style="color:red;"></i> Failed');

  if (xhr.getResponseHeader('showinui') === 'true') {
    jQuery('#info-banner').html('<i class="fa fa-times" aria-hidden="true" style="color:red;"></i> ' + xhr.responseJSON.message);
  }

  resetSimulateButton();
}

function processRequest(url, payload, callback) {
  ajaxRequest({
    method: 'POST',
    headers:{ 'Content-Type' : 'application/json' },
    url: url,
    data: payload
  }, callback);
}

function runAction(action) {
  var url = 'http://localhost:10001/web/actions/' + action;
  var data = monaco.editor.getModel(modelURI).getValue();

  processRequest(url, data, function(err, actiondata, xhr) {
    if (err) {
      return showError(xhr);
    }

    var options = {
      method: 'POST',
      url: 'http://localhost:10001/dprouter',
      headers: {
        'content-type': 'application/json',
        'mkp-route': 'smi'
      },
      data: JSON.stringify({
        methodName: action,
        methodParams: JSON.parse(monaco.editor.getModel(modelURI).getValue()),
        action: 'invoke'
      })
    };

    ajaxRequest(options, function(err, actiondata, xhr) {
      if (err || (actiondata && actiondata.status >= INTERNAL_SERVER_ERROR_STATUS)) {
        return showError(xhr);
      }

      url = 'http://localhost:10001/web/validateAction/' + action;
      data = JSON.stringify(actiondata.response);

      processRequest(url, data, function(err, data, xhr) {
        if (err) {
          return showError(xhr);
        }
        else if (data) {
          jQuery('#info-banner').html('<i class="fa fa-check" aria-hidden="true" style="color:green;"></i> ' + JSON.stringify(data, null, 2));
          jQuery('#simulate-event').html('<i class="fa fa-check" aria-hidden="true" style="color:green;"></i> Success');
        }

        resetSimulateButton();
      });
    });
  });
}

function runEvent(event) {
  var url = 'http://localhost:10001/web/events/' + event;
  var data = monaco.editor.getModel(modelURI).getValue();

  processRequest(url, data, function(err) {
    if (!err) {
      ajaxRequest({
        method: 'POST',
        url: 'http://localhost:10001/event/execute?name=' + event
      }, function(err, data, xhr) {
        if (err) {
          return showError(xhr);
        }

        jQuery('#simulate-event').html('<i class="fa fa-check" aria-hidden="true" style="color:green;"></i> Success');

        resetSimulateButton();
      });
    }
  });
}

$(document).ready(function() {
  ajaxRequest({
    url: 'http://localhost:10001/web/actionsList',
    method: 'GET',
    timeout: eventListTimeout,
    headers:{ 'Content-Type' : 'application/json' }
  }, function(err, data) {
    if (!err) {
      if (data.actions.length > 0) {
        jQuery('#type-main-div').removeClass('hide');
      }
      else {
        jQuery('#dropdownBox').removeClass('hide');
        jQuery('#event-main-div').removeClass('hide');
      }
    }
  });
});

jQuery('#type-sel').on('click', function() {
  var typeHtml = '';

  if (jQuery('#type-dropdown li').length === 0) {
    list.forEach(function(type) {
      typeHtml += '<li><a href="#">' + type + '</a></li>';
    });

    jQuery('#type-dropdown').append(typeHtml);
  }
});

jQuery('#type-dropdown').on('click', function(e) {

  var type = e.target.text;

  jQuery('#type-sel').text(type);
  if (type === 'actions') {
    jQuery('#actions-main-div').removeClass('hide');
    jQuery('#event-main-div').addClass('hide');
    jQuery('#actions-sel').text('Select an action');
  }
  else {
    jQuery('#actions-main-div').addClass('hide');
    jQuery('#event-main-div').removeClass('hide');
    jQuery('#event-sel').text('Select an event');
  }

  jQuery('#dropdownBox').removeClass('hide');
  $('.select-type-container').addClass('float-left');
  $('#dropdownBox').addClass('float-left');
  jQuery('#dropdownBox').removeClass('hide');
});

jQuery('#event-sel').on('click', function() {
  if (jQuery('#event-dropdown li').length === 0) {
    ajaxRequest({
      url: 'http://localhost:10001/web/eventsList',
      method: 'GET',
      timeout: eventListTimeout,
      headers:{ 'Content-Type' : 'application/json' }
    }, function(err, data) {
      if (err) {
        jQuery('#event-area').html('<i class="fa" aria-hidden="true" style="color:red;">Error while fetching the events. Please refresh the page and try again.</i>');
        return;
      }
      var eventHtml = '';

      data.events.forEach(function(event) {
        eventHtml += '<li><a href="#">' + event + '</a></li>';
      });
      jQuery('#event-dropdown').append(eventHtml);
    });
  }
});

jQuery('#actions-sel').on('click', function() {
  if (jQuery('#actions-dropdown li').length === 0) {
    ajaxRequest({
      url: 'http://localhost:10001/web/actionsList',
      method: 'GET',
      timeout: eventListTimeout,
      headers:{ 'Content-Type' : 'application/json' }
    }, function(err, data) {
      if (err) {
        jQuery('#event-area').html('<i class="fa" aria-hidden="true" style="color:red;">Error while fetching the actions. Please refresh the page and try again.</i>');
        return;
      }
      var actionHtml = '';

      data.actions.forEach(function(action) {
        actionHtml += '<li><a href="#">' + action + '</a></li>';
      });
      jQuery('#actions-dropdown').append(actionHtml);
    });
  }
});

function validateAndShowDeprecationWarning(event) {
  if (products.hasOwnProperty('freshdesk') || products.hasOwnProperty('freshservice')) {
    return;
  }
  if (event === 'onAppInstall' || event === 'onAppUninstall') {
    jQuery('#info-banner').html('<i class="fa fa-warning" aria-hidden="true" style="color:orange;"></i> We recommend using end-to-end testing to simulate app setup events.');
  } else {
    jQuery('#info-banner').html('Select an event or action to simulate');
  }
}

jQuery('#event-dropdown').on('click', function(e) {
  var event = e.target.text;

  validateAndShowDeprecationWarning(event);
  jQuery('#event-sel').text(event);
  showEditor(event, 'events');
});

jQuery('#actions-dropdown').on('click', function(e) {
  var action = e.target.text;

  jQuery('#actions-sel').text(action);

  showEditor(action, 'actions');
});

jQuery('#simulate-event').on('click', function() {
  var type = jQuery('#type-sel').text();

  jQuery('#simulate-event').attr('disabled', true);

  if (type === 'actions') {
    var action = jQuery('#actions-sel').text();

    runAction(action);
  }
  else {
    var event = jQuery('#event-sel').text();

    runEvent(event);
  }
});

jQuery('#reset-event').on('click', function() {

  var type = jQuery('#type-sel').text();
  var url = '';

  if (type === 'actions') {
    var action = jQuery('#actions-sel').text();

    url = 'http://localhost:10001/web/actions/reset/' + action;
  }
  else {
    var event = jQuery('#event-sel').text();

    url = 'http://localhost:10001/web/events/reset/' + event;
  }

  jQuery.ajax({
    method: 'POST',
    url: url
  })
    .done(function(data) {
      monaco.editor.getModel(modelURI).setValue(JSON.stringify(data, null, 2));
    });
});


jQuery.ajax({
  url: 'http://localhost:10001/iframe/api',
  method: 'get'
}).done(function(data) {
  products = data.product;
  if (data.features.indexOf('oauth') !== -1) {
    jQuery.ajax({
      url: 'http://localhost:10001/accesstoken',
      method: 'get'
    })
      .fail(function() {
        jQuery('#event-area').addClass('area-disable');
        jQuery('#info-banner').html('This app uses OAuth. <a href="http://localhost:10001/auth/index?callback=http://localhost:10001/web/events">Click here to authorize.</a>');
      });
  }
});
