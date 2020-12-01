'use strict';

const { model: { limit: { entityField } } } = require('../validations/constants');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('entity_fields', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      entity_id: {
        type: Sequelize.BIGINT
      },
      name: {
        type: Sequelize.STRING
      },
      label: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING(entityField.type)
      },
      required: {
        type: Sequelize.BOOLEAN
      },
      filterable: {
        type: Sequelize.BOOLEAN
      },
      deleted: {
        type: Sequelize.BOOLEAN
      },
      parent_field_id: {
        type: Sequelize.BIGINT
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('entity_fields');
  }
};
