'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jam_dinas_pegawai', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama jam dinas'
      },
      hari_kerja: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        comment: 'Jumlah hari kerja dalam seminggu'
      },
      menit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total menit kerja per hari'
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

    // Add index for better performance
    await queryInterface.addIndex('jam_dinas_pegawai', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('jam_dinas_pegawai');
  }
};

