'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bigint_pivots', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      entity_id: {
        type: Sequelize.BIGINT
      },
      entity_field_id: {
        type: Sequelize.BIGINT
      },
      field_value: {
        type: Sequelize.BIGINT
      },
      is_present:{
        type: Sequelize.BOOLEAN
      },
      record_id: {
        type: Sequelize.BIGINT
      },
      tenant_id: {
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
    await queryInterface.dropTable('bigint_pivots');
  }
};
