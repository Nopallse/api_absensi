'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kehadiran', 'jenis_kehadiran', {
      type: Sequelize.ENUM('BIASA', 'KEGIATAN'),
      allowNull: false,
      defaultValue: 'BIASA',
      comment: 'Jenis kehadiran: BIASA untuk kehadiran harian, KEGIATAN untuk kehadiran kegiatan'
    });

    await queryInterface.addColumn('kehadiran', 'id_kegiatan', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'ID kegiatan jika jenis_kehadiran = KEGIATAN',
      references: {
        model: 'master_jadwal_kegiatan',
        key: 'id_kegiatan'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('kehadiran', 'id_kegiatan');
    await queryInterface.removeColumn('kehadiran', 'jenis_kehadiran');
  }
};
