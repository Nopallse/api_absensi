'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('master_jadwal_kegiatan', 'jam_mulai', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Jam mulai kegiatan dalam format HH:MM:SS'
    });

    await queryInterface.addColumn('master_jadwal_kegiatan', 'jam_selesai', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Jam selesai kegiatan dalam format HH:MM:SS'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'jam_mulai');
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'jam_selesai');
  }
};
