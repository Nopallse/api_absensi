'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kehadiran', 'nama_jabatan', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama jabatan pegawai saat melakukan kehadiran (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'nama_jabatan', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama jabatan peserta saat ditambahkan (data historis)'
    });

    // Pertahankan nilai lama sementara dengan menyalin kode jabatan ke nama_jabatan
    await queryInterface.sequelize.query(`
      UPDATE kehadiran
      SET nama_jabatan = KODE_JABATAN
      WHERE nama_jabatan IS NULL AND KODE_JABATAN IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE peserta_grup_kegiatan
      SET nama_jabatan = KODE_JABATAN
      WHERE nama_jabatan IS NULL AND KODE_JABATAN IS NOT NULL
    `);

    await queryInterface.removeColumn('kehadiran', 'KODE_JABATAN');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'KODE_JABATAN');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('kehadiran', 'KODE_JABATAN', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode jabatan pegawai saat melakukan kehadiran (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'KODE_JABATAN', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode jabatan peserta saat ditambahkan (data historis)'
    });

    await queryInterface.sequelize.query(`
      UPDATE kehadiran
      SET KODE_JABATAN = nama_jabatan
      WHERE KODE_JABATAN IS NULL AND nama_jabatan IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE peserta_grup_kegiatan
      SET KODE_JABATAN = nama_jabatan
      WHERE KODE_JABATAN IS NULL AND nama_jabatan IS NOT NULL
    `);

    await queryInterface.removeColumn('kehadiran', 'nama_jabatan');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'nama_jabatan');
  }
};

