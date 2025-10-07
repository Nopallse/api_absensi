'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Hapus foreign key constraint menggunakan raw SQL
    await queryInterface.sequelize.query(`
      SET FOREIGN_KEY_CHECKS = 0;
    `);

    // Drop tabel lokasi jika ada
    await queryInterface.dropTable('lokasi');

    // Enable foreign key checks kembali
    await queryInterface.sequelize.query(`
      SET FOREIGN_KEY_CHECKS = 1;
    `);

    // Buat tabel lokasi baru
    await queryInterface.createTable('lokasi', {
      lokasi_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'lokasi_id'
      },
      id_unit_kerja: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'id_unit_kerja',
        comment: 'ID unit kerja yang memiliki lokasi ini'
      },
      kd_unit_kerja: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'kd_unit_kerja',
        comment: 'Kode unit kerja (level1/level2/level3)'
      },
      level_unit_kerja: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'level_unit_kerja',
        comment: 'Level unit kerja: 1, 2, atau 3'
      },
      parent_lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'parent_lokasi_id',
        comment: 'ID lokasi parent (untuk inheritance)'
      },
      lat: {
        type: Sequelize.FLOAT,
        allowNull: false,
        field: 'lat'
      },
      lng: {
        type: Sequelize.FLOAT,
        allowNull: false,
        field: 'lng'
      },
      range: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
        field: 'range',
        comment: 'Radius dalam meter'
      },
      nama_lokasi: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'nama_lokasi',
        comment: 'Nama lokasi (opsional)'
      },
      alamat: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'alamat',
        comment: 'Alamat lengkap lokasi'
      },
      ket: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'ket',
        comment: 'Keterangan tambahan lokasi'
      },
      is_inherited: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_inherited',
        comment: 'Apakah lokasi ini diwariskan dari parent'
      },
      status: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'status',
        comment: 'Status aktif/non-aktif lokasi'
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'created_by',
        comment: 'User yang membuat lokasi'
      },
      updated_by: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'updated_by',
        comment: 'User yang mengupdate lokasi'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    });

    // Tambahkan index untuk performa
    await queryInterface.addIndex('lokasi', ['kd_unit_kerja']);
    await queryInterface.addIndex('lokasi', ['level_unit_kerja']);
    await queryInterface.addIndex('lokasi', ['status']);
    await queryInterface.addIndex('lokasi', ['parent_lokasi_id']);
  },

  async down(queryInterface, Sequelize) {
    // Hapus tabel lokasi
    await queryInterface.dropTable('lokasi');
  }
};
