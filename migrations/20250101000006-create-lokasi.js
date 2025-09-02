'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lokasi', {
      lokasi_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      lat: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      lng: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      range: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Radius dalam meter'
      },
      id_skpd: {
        type: Sequelize.STRING,
        allowNull: true
      },
      id_satker: {
        type: Sequelize.STRING,
        allowNull: true
      },
      id_bidang: {
        type: Sequelize.STRING,
        allowNull: true
      },
      ket: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Keterangan lokasi'
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
    await queryInterface.dropTable('lokasi');
  }
};
