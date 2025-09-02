'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bidang_tbl', {
      BIDANGF: {
        type: Sequelize.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      NMBIDANG: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      NAMA_JABATAN: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      KDSATKER: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: {
          model: 'satker_tbl',
          key: 'KDSATKER'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      STATUS_BIDANG: {
        type: Sequelize.CHAR(1),
        allowNull: true
      },
      TANGGAL_DIBUAT: {
        type: Sequelize.DATE,
        allowNull: true
      },
      KETERANGAN: {
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
      KODE_SIASN: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bidang_tbl');
  }
};
