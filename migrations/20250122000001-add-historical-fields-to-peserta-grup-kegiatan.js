'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('peserta_grup_kegiatan', 'NM_UNIT_KERJA', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama unit kerja peserta saat ditambahkan ke grup (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'KDSATKER', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Kode satker peserta saat ditambahkan ke grup (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'BIDANGF', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode bidang peserta saat ditambahkan ke grup (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'SUBF', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode sub bidang peserta saat ditambahkan ke grup (data historis)'
    });

    await queryInterface.addColumn('peserta_grup_kegiatan', 'KODE_JABATAN', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode jabatan peserta saat ditambahkan ke grup (data historis)'
    });

    await queryInterface.addIndex('peserta_grup_kegiatan', ['KDSATKER'], {
      name: 'idx_peserta_grup_kegiatan_kdsatker'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('peserta_grup_kegiatan', 'idx_peserta_grup_kegiatan_kdsatker');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'KODE_JABATAN');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'SUBF');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'BIDANGF');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'KDSATKER');
    await queryInterface.removeColumn('peserta_grup_kegiatan', 'NM_UNIT_KERJA');
  }
};

