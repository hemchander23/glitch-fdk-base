'use strict';

const PRODUCTS_URL = 'http://localhost:10001/get_products';
const IFRAME_API_URL = 'http://localhost:10001/iframe/api';
let productsMap, products;

/**
 * get the query string from the url
 */
function getQueryString(key) {
  // eslint-disable-next-line
  key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, '\\$&');
  const match = window.location.search.match(new RegExp('[?&]' + key + '=([^&]+)(&|$)'));

  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

/**
 * check the rendered product is an omni app
 */
function isOmniApp(products) {
  return products.length > 1;
}

/**
 * Get the product option HTML render in UI
 */
function getProductOptionsHtml(products) {
  let result = '';

  products.forEach(product => {
    return result += `<li> <a href="#" name="${product}">${productsMap[product].name}</a> </li>`;
  });

  return result;
}

/**
 * Render product options inside product select
 */
function renderProductChooser(mfProducts) {
  const productOptionsHtml = getProductOptionsHtml(mfProducts);

  jQuery('#product-dropdown').append(productOptionsHtml);
}

/**
 * Click event listener for product picker
 */
jQuery('#product-dropdown').on('click', function (e) {
  const productName = e.target.getAttribute('name');
  const productDisplayName = e.target.text;

  const callbackURL = getQueryString('callback');

  jQuery('#product-sel').text(productDisplayName);
  window.location.href = `${callbackURL}/?product=${productName}`;
});

/**
 * jQuery ready function
 */
jQuery(window.document).ready(function () {
  jQuery.when(jQuery.get(PRODUCTS_URL),
    jQuery.get(IFRAME_API_URL)).then(function (productURL, appAPI) {
    productsMap = productURL[0].productsMap;
    products = Object.keys(appAPI[0].product);

    if (!isOmniApp(products)) {
      window.location.href = getQueryString('callback');
    } else {
      renderProductChooser(products);
    }
  });
});
