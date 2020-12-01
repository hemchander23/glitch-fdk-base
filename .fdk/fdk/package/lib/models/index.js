'use strict';

const debuglog = __debug.bind(null, __filename);

const fs = require('fs');
const path = require('path');

const sequelize = require('../instances/sequelize.js');

const models = {};
const basename = path.basename(__filename);

const FILE_EXTENSION_INDEX = -3;

fs
  .readdirSync(__dirname + '/../models')
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(FILE_EXTENSION_INDEX) === '.js');
  })
  .forEach(file => {
    const modulePath = path.join(__dirname, '../models', file);

    debuglog(`loading model at "${modulePath}"`);

    const model = require(modulePath);

    models[model.name] = model;
  });

Object.keys(models).forEach(model => {
  models[model].initialize(sequelize, models);
});

Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
