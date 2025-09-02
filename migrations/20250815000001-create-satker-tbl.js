'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('satker_tbl', {
      KDSATKER: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      KDSKPD: {
        type: Sequelize.STRING(3),
        allowNull: false,
        references: {
          model: 'skpd_tbl',
          key: 'KDSKPD'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      NMSATKER: {
        type: Sequelize.STRING(75),
        allowNull: true
      },
      NAMA_JABATAN: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      STATUS_SATKER: {
        type: Sequelize.CHAR(1),
        allowNull: true
      },
      TANGGAL_DIBUAT: {
        type: Sequelize.DATE,
        allowNull: true
      },
      KETERANGAN_SATKER: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      KDESELON: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      BUP: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      JENIS_JABATAN: {
        type: Sequelize.ENUM('Struktural', 'Tugas Tambahan'),
        allowNull: true
      },
      NO_URUT: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      KODE_SIASN: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('satker_tbl');
  }
};
