'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('kehadiran_kegiatan', {
      absen_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      absen_nip: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'NIP pegawai yang melakukan kehadiran'
      },
      lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        },
        comment: 'ID lokasi kegiatan'
      },
      id_kegiatan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_jadwal_kegiatan',
          key: 'id_kegiatan'
        },
        comment: 'ID kegiatan yang dihadiri'
      },
      absen_tgl: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal kehadiran'
      },
      absen_tgljam: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal dan jam kehadiran'
      },
      absen_kat: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'HADIR',
        validate: {
          isIn: [['HADIR']]
        },
        comment: 'Kategori kehadiran (untuk kegiatan hanya HADIR)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('kehadiran_kegiatan', ['absen_nip']);
    await queryInterface.addIndex('kehadiran_kegiatan', ['id_kegiatan']);
    await queryInterface.addIndex('kehadiran_kegiatan', ['absen_tgl']);
    await queryInterface.addIndex('kehadiran_kegiatan', ['absen_nip', 'id_kegiatan', 'absen_tgl'], {
      unique: true,
      name: 'unique_kehadiran_kegiatan_per_day'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('kehadiran_kegiatan');
  }
};
