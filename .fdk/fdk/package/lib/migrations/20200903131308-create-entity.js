'use strict';

const { model: { limit: { entity } } } = require('../validations/constants');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('entities', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      product_name: {
        allowNull: false,
        type: Sequelize.STRING(entity.productName)
      },
      organisation_id: {
        allowNull: false,
        type: Sequelize.STRING(entity.organisationId)
      },
      tenant_id: {
        allowNull: false,
        type: Sequelize.BIGINT
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING(entity.name)
      },
      prefix: {
        allowNull: false,
        type: Sequelize.STRING(entity.prefix)
      },
      deleted: {
        type: Sequelize.BOOLEAN
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      count: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 0
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('entities');
  }
};
