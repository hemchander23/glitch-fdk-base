'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('records', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      entity_id: {
        type: Sequelize.BIGINT
      },
      display_id: {
        type: Sequelize.BIGINT
      },
      record: {
        type: Sequelize.TEXT
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
    await queryInterface.dropTable('records');
  }
};
