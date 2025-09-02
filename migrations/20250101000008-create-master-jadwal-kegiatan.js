'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('master_jadwal_kegiatan', {
      id_kegiatan: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tanggal_kegiatan: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Tanggal kegiatan dalam format YYYY-MM-DD'
      },
      jenis_kegiatan: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Jenis kegiatan (Apel Gabungan, Wirid, Senam, dll)'
      },
      keterangan: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Keterangan detail kegiatan'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('master_jadwal_kegiatan');
  }
};
