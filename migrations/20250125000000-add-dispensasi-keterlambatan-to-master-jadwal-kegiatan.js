'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom dispensasi_keterlambatan
    await queryInterface.addColumn('master_jadwal_kegiatan', 'dispensasi_keterlambatan', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'Dispensasi keterlambatan dalam menit. Null berarti tidak ada dispensasi'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus kolom dispensasi_keterlambatan
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'dispensasi_keterlambatan');
  }
};
