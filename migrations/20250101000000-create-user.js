'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      auth_key: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password_reset_token: {
        type: Sequelize.STRING,
        allowNull: true
      },
      level: {
        type: Sequelize.STRING,
        allowNull: false
      },
      id_opd: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      id_upt: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false
      },
      device_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      fcm_token: {
        type: Sequelize.STRING,
        allowNull: true
      },
      refresh_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user');
  }
};
