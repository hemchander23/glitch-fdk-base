'use strict';

const debuglog = __debug.bind(null, __filename);

const { Sequelize } = require('sequelize');

const SQLITE_PATH = `${process.cwd()}/.fdk/store.sqlite`;

debuglog(`setting up sqilite at "${SQLITE_PATH}"`);

const sequelizeOptions = {
  storage: SQLITE_PATH,
  dialect: 'sqlite',
  logging: false,
  define: {
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  dialectOptions: {
    supportBigNumbers: true,
    bigNumberStrings: true
  }
};

module.exports = new Sequelize(sequelizeOptions);
