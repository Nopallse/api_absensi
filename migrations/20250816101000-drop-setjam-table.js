'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop old setjam table
    await queryInterface.dropTable('setjam');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate setjam table if needed for rollback
    await queryInterface.createTable('setjam', {
      jam_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      jam_checkin: {
        type: Sequelize.TIME,
        allowNull: false
      },
      jam_checkout: {
        type: Sequelize.TIME,
        allowNull: false
      }
    });
  }
};
