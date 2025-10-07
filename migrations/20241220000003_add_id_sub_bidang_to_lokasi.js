'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tambahkan kolom id_satker, id_bidang, id_sub_bidang ke tabel lokasi
    await queryInterface.addColumn('lokasi', 'id_satker', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID satker (Level 1) - wajib diisi'
    });

    await queryInterface.addColumn('lokasi', 'id_bidang', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID bidang (Level 2) - opsional, jika diisi maka lokasi khusus untuk bidang'
    });

    // id_sub_bidang sudah ada, tidak perlu ditambahkan lagi

    // Tambahkan index untuk performa query
    await queryInterface.addIndex('lokasi', ['id_satker', 'id_bidang', 'id_sub_bidang'], {
      name: 'idx_lokasi_hierarchy',
      unique: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus index
    await queryInterface.removeIndex('lokasi', 'idx_lokasi_hierarchy');
    
    // Hapus kolom yang ditambahkan
    await queryInterface.removeColumn('lokasi', 'id_satker');
    await queryInterface.removeColumn('lokasi', 'id_bidang');
  }
};
