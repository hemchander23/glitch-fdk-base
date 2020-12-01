'use strict';

const FORM_URL = 'http://localhost:10001/custom_configs/form';
const FETCH_CONFIGS_URL = 'http://localhost:10001/custom_configs/fetch';
const STORE_CONFIGS_URL = 'http://localhost:10001/custom_configs/store';
const IFRAME_API_URL = 'http://localhost:10001/iframe/api';
const PRODUCTS_URL = 'http://localhost:10001/get_products';
const STORE_FAILRUE = 'Failed to store installation parameters.';
const STORE_SUCCESS = 'App installation parameters have been successfully stored. You can now proceed to test the app.';
const FETCH_FAILURE = 'Failed to fetch installation parameters.';
const VALIDATION_FAILURE = 'Validation failed.';
const ERROR_CALLING_METHOD = 'Error occurred while calling method: ';
const SUBMIT_FAILURE = 'Failed to submit installation parameters';
const SUCCESS = 'success';
const FAILURE = 'failure';
const CUSTOM_IPARAM = 'custom_iparam';
const SUBMIT_EVENT = 'custom_iparam.submit';
const LISTEN_EVENT = 'custom_iparam.listen';
const INSTALL = 'install';
const SNACK_BAR_TIMEOUT = 3000;
const NEW_STATE = 'new';
const EDIT_STATE = 'edit';

/*
  1. Get the form content and inject into the DOM
    - Get stored configs (if-any) & pass to getConfigs
  2. If 404 is returned (custom installation page doesn't exist) show error
*/
var appInstance = null;
var products = null;

function showSnackBar(message, errClass) {
  jQuery('#snackbar').fadeIn();
  jQuery('#snackbar').addClass(`snackbar-${errClass} show`);
  jQuery('#snackbar').text(message);
  setTimeout(function () {
    jQuery('#snackbar').fadeOut(function () {
      jQuery('#snackbar').removeClass(`snackbar-${errClass} show`);
    });
  }, SNACK_BAR_TIMEOUT);
}

/**
 * get the query string from the url
 */
function getQueryString(key) {
  // eslint-disable-next-line
  key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, '\\$&');
  const match = window.location.search.match(new RegExp('[?&]' + key + '=([^&]+)(&|$)'));

  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

/*
  Triggers 'custom_iparam.submit' event to parent so that parent can
  get installation parameters from client.
*/
var submitIparam = function () {
  return appInstance.trigger({
      type: SUBMIT_EVENT
    })
    .then(function (data) {
      return Promise.resolve(data);
    }, function (e) {
      if (e.hasOwnProperty('isValid') && !e.isValid) {
        return Promise.reject(`${VALIDATION_FAILURE}`);
      }

      if (e.hasOwnProperty('method')) {
        return Promise.reject(`${ERROR_CALLING_METHOD} '${e.method}' - ${e.error.message || JSON.stringify(e)}`);
      }

      return Promise.reject(`${SUBMIT_FAILURE} - ${e.error.message || JSON.stringify(e)}`);
    });
};

/*
  Push the data obtained from postConfigs to fdk which stores in local file
*/
function pushToServer(customIParams) {
  const product = products.length > 1 ? getQueryString('product') : products[0];

  const queryString = `?product=${product}`;

  return new Promise(function () {
    jQuery.ajax({
        url: `${STORE_CONFIGS_URL}${queryString}`,
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        data: JSON.stringify(customIParams.configs)
      })
      .then(function () {
        showSnackBar(STORE_SUCCESS, SUCCESS);
      }, function (err) {
        showSnackBar(`${STORE_FAILRUE}`, FAILURE);
        console.log(`${STORE_FAILRUE} - ${JSON.stringify(err)}`);
      });
  });
}

function handleError(errMessage) {
  if (errMessage) {
    showSnackBar(errMessage, FAILURE);
  }
}

function bindActions() {
  jQuery('#iparams-install').click(function () {
    submitIparam()
      .then(pushToServer)
      .catch(handleError);
  });

  jQuery('#backBtnId').click(function () {
    // if the custom_configs will always redirect to product switcher if it is omni app.
    window.location.href = 'http://localhost:10001/custom_configs';
  });
}

/*
  Method to show the flash message if the app doesn't have a custom installation page
*/
function showWarning() {
  jQuery('.box').css('height', '129px');
  jQuery('.form-actions').hide();
  jQuery('.box-row').hide();
  jQuery('.box-row-err').show();
}

function isCustomSettingsApp(features) {
  return features && features.includes('iparams_hidden_buttons');
}

function initializeFramework() {

  /*
    - Generate the iframe using Marketplace Manager with adapter and App details
    - Inject the iframe to DOM (form-div)
    - Send prefetched configs to the page
    - Bind actions
  */

  jQuery.when(jQuery.get(IFRAME_API_URL), jQuery.get(PRODUCTS_URL))
    .then(function (appData, productURL) {
      products = Object.keys(appData[0].product);

      const product = products.length > 1 ? getQueryString('product') : products[0];

      const queryString = `?product=${product}`;
      const productsMap = productURL[0].productsMap;

      jQuery.get(`${FETCH_CONFIGS_URL}${queryString}`).then(function (configs) {
        // If the app doesn't have custom configs, show warning
        if (!configs.hasIParam) {
          return showWarning();
        }

        jQuery('#productNameId').html(productsMap[product].name);

        if (products.length > 1) {
          jQuery('#btnContainerId').removeClass('hide');
        }

        /*
      Adapter for the custom installation page.
    */
        const adapter = {
          Promise: window.Promise,
          ajax: jQuery.ajax,
          page: CUSTOM_IPARAM,
          accountID: '0',
          domain: 'dummy',
          csrfToken: 'dummy',
          product: product,
          locations: {
            [CUSTOM_IPARAM]: {
              services: {}
            }
          },
          productContext: {
            name: product,
            url: productsMap[product].link
          },
          isInstall: true,
          galleryURL: 'https://domain.freshworks.com/a/integrations/'
        };

        const app = {
          locations: {
            [CUSTOM_IPARAM]: {
              url: FORM_URL
            }
          },
          features: appData[0].features,
          isLocal: true,
          configs: configs.customIParams,
          state: Object.keys(configs.customIParams).length > 0 ? EDIT_STATE: NEW_STATE
        };

        // eslint-disable-next-line no-undef
        const appManager = new MarketplaceManager(adapter);

        appInstance = appManager.createInstance(app);

        if (!isCustomSettingsApp(appData[0].features)) {
          jQuery('#iparams-install').removeClass('hide');
        } else {
          appInstance.trigger({
            type: LISTEN_EVENT,
            callback: (params) => {
                // eslint-disable-next-line no-unused-expressions
              if (params === INSTALL) {
                submitIparam()
                .then(pushToServer)
                .catch(handleError);
              }
            }
          });
        }

        jQuery('#iparams-form').html(appInstance.element);

        bindActions();
      }).catch(function (err) {
        showSnackBar(FETCH_FAILURE, FAILURE);
        console.log(`${FETCH_FAILURE} - ${JSON.stringify(err)}`);
      });
    }).catch(function (err) {
      showSnackBar(FETCH_FAILURE, FAILURE);
      console.log(`${FETCH_FAILURE} - ${JSON.stringify(err)}`);
    });
}

initializeFramework();
