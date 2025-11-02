'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom jam_mulai
    await queryInterface.addColumn('master_jadwal_kegiatan', 'jam_mulai', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Jam mulai kegiatan dalam format HH:MM:SS'
    });

    // Tambahkan kolom jam_selesai
    await queryInterface.addColumn('master_jadwal_kegiatan', 'jam_selesai', {
      type: Sequelize.TIME,
      allowNull: true,
      comment: 'Jam selesai kegiatan dalam format HH:MM:SS'
    });

    // Tambahkan kolom include_absen
    await queryInterface.addColumn('master_jadwal_kegiatan', 'include_absen', {
      type: Sequelize.ENUM('none', 'pagi', 'sore', 'keduanya'),
      allowNull: false,
      defaultValue: 'none',
      comment: 'Ketentuan absen: none=Hanya kehadiran kegiatan, pagi=Menggantikan absen pagi, sore=Menggantikan absen sore, keduanya=Menggantikan absen pagi dan sore'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus kolom include_absen (ENUM perlu di-drop terlebih dahulu)
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'include_absen');
    
    // Hapus kolom jam_selesai
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'jam_selesai');
    
    // Hapus kolom jam_mulai
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'jam_mulai');
  }
};

