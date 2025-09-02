'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('dinas_setjam', {
      dinset_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      dinset_nama: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama assignment jam dinas'
      },
      id_skpd: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID SKPD yang menggunakan jam dinas ini'
      },
      id_satker: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID Satker yang menggunakan jam dinas ini'
      },
      id_bidang: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID Bidang yang menggunakan jam dinas ini'
      },
      id_jamdinas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Referensi ke jam_dinas'
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 1,
        comment: '1=aktif, 0=nonaktif'
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dinas_setjam');
  }
};
