'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jadwal_kegiatan_lokasi_skpd', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_kegiatan: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      kdskpd: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Kode SKPD yang diarahkan ke lokasi ini'
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
    await queryInterface.dropTable('jadwal_kegiatan_lokasi_skpd');
  }
};
