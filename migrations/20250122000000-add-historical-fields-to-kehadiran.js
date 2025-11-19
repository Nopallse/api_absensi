'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom NM_UNIT_KERJA
    await queryInterface.addColumn('kehadiran', 'NM_UNIT_KERJA', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Nama unit kerja pegawai saat melakukan kehadiran (data historis)'
    });

    // Tambahkan kolom KDSATKER
    await queryInterface.addColumn('kehadiran', 'KDSATKER', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Kode satker pegawai saat melakukan kehadiran (data historis)'
    });

    // Tambahkan kolom BIDANGF
    await queryInterface.addColumn('kehadiran', 'BIDANGF', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode bidang pegawai saat melakukan kehadiran (data historis)'
    });

    // Tambahkan kolom SUBF
    await queryInterface.addColumn('kehadiran', 'SUBF', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode sub bidang pegawai saat melakukan kehadiran (data historis)'
    });

    // Tambahkan kolom KODE_JABATAN
    await queryInterface.addColumn('kehadiran', 'KODE_JABATAN', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Kode jabatan pegawai saat melakukan kehadiran (data historis)'
    });

    // Tambahkan index untuk kolom KDSATKER untuk performa query
    await queryInterface.addIndex('kehadiran', ['KDSATKER']);
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus index terlebih dahulu
    await queryInterface.removeIndex('kehadiran', ['KDSATKER']);
    
    // Hapus kolom-kolom
    await queryInterface.removeColumn('kehadiran', 'KODE_JABATAN');
    await queryInterface.removeColumn('kehadiran', 'SUBF');
    await queryInterface.removeColumn('kehadiran', 'BIDANGF');
    await queryInterface.removeColumn('kehadiran', 'KDSATKER');
    await queryInterface.removeColumn('kehadiran', 'NM_UNIT_KERJA');
  }
};

