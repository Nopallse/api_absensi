'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('peserta_grup_kegiatan');
    
    // Hanya tambah kolom jika belum ada
    if (!tableDescription.NM_UNIT_KERJA) {
      await queryInterface.addColumn('peserta_grup_kegiatan', 'NM_UNIT_KERJA', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Nama unit kerja peserta saat ditambahkan ke grup (data historis)'
      });
    }

    if (!tableDescription.KDSATKER) {
      await queryInterface.addColumn('peserta_grup_kegiatan', 'KDSATKER', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Kode satker peserta saat ditambahkan ke grup (data historis)'
      });
    }

    if (!tableDescription.BIDANGF) {
      await queryInterface.addColumn('peserta_grup_kegiatan', 'BIDANGF', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Kode bidang peserta saat ditambahkan ke grup (data historis)'
      });
    }

    if (!tableDescription.SUBF) {
      await queryInterface.addColumn('peserta_grup_kegiatan', 'SUBF', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Kode sub bidang peserta saat ditambahkan ke grup (data historis)'
      });
    }

    if (!tableDescription.nama_jabatan) {
      await queryInterface.addColumn('peserta_grup_kegiatan', 'nama_jabatan', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Nama jabatan peserta saat ditambahkan ke grup (data historis)'
      });
    }

    // Cek apakah index sudah ada sebelum menambahkan
    const indexes = await queryInterface.showIndex('peserta_grup_kegiatan');
    const indexExists = indexes.some(index => index.name === 'idx_peserta_grup_kegiatan_kdsatker');
    
    if (!indexExists) {
      await queryInterface.addIndex('peserta_grup_kegiatan', ['KDSATKER'], {
        name: 'idx_peserta_grup_kegiatan_kdsatker'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('peserta_grup_kegiatan', 'idx_peserta_grup_kegiatan_kdsatker');
    } catch (error) {
      // Index mungkin tidak ada
    }
    
    const tableDescription = await queryInterface.describeTable('peserta_grup_kegiatan');
    
    if (tableDescription.nama_jabatan) {
      await queryInterface.removeColumn('peserta_grup_kegiatan', 'nama_jabatan');
    }
    if (tableDescription.SUBF) {
      await queryInterface.removeColumn('peserta_grup_kegiatan', 'SUBF');
    }
    if (tableDescription.BIDANGF) {
      await queryInterface.removeColumn('peserta_grup_kegiatan', 'BIDANGF');
    }
    if (tableDescription.KDSATKER) {
      await queryInterface.removeColumn('peserta_grup_kegiatan', 'KDSATKER');
    }
    if (tableDescription.NM_UNIT_KERJA) {
      await queryInterface.removeColumn('peserta_grup_kegiatan', 'NM_UNIT_KERJA');
    }
  }
};

