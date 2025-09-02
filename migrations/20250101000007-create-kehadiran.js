'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kehadiran', {
      absen_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      absen_nip: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      absen_tgl: {
        type: Sequelize.DATE,
        allowNull: false
      },
      absen_tgljam: {
        type: Sequelize.DATE,
        allowNull: false
      },
      absen_checkin: {
        type: Sequelize.TIME,
        allowNull: true
      },
      absen_checkout: {
        type: Sequelize.TIME,
        allowNull: true
      },
      absen_kat: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'HADIR'
      },
      absen_apel: {
        type: Sequelize.STRING,
        allowNull: true
      },
      absen_sore: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kehadiran');
  }
};
