'use strict';

const productInfo = require('../utils/product-info-util');


const Router = require('express').Router;
const productSwitchRouter = new Router();

/*
  Route handler - To fetch product chooser Page
*/
function chooseProductPage(req, res) {
  return res.render('product-switcher.html');
}

/*
  Route handler - fetch
  Get product_name -> product_display_name mappings
*/
function fetchProductsMap(req, res) {
  const products = productInfo.getProductsMap();
  const productsLinks = productInfo.getTestLink();
  const productsMap = {};

  Object.keys(products)
    .forEach(product => productsMap[product] = {
      name: products[product],
      link: `https://${new URL(productsLinks[product]).host}`
    });

  return res.json({
    productsMap
  });
}

productSwitchRouter.get('/get_products', fetchProductsMap);
productSwitchRouter.get('/choose_product', chooseProductPage);

module.exports = productSwitchRouter;
