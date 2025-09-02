'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jam_dinas_detail', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_jamdinas: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      hari: {
        type: Sequelize.ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'),
        allowNull: false
      },
      tipe: {
        type: Sequelize.ENUM('normal', 'ramadhan'),
        allowNull: false,
        defaultValue: 'normal'
      },
      jam_masuk_mulai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam masuk'
      },
      jam_masuk_selesai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam masuk'
      },
      jam_pulang_mulai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam pulang'
      },
      jam_pulang_selesai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam pulang'
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
    await queryInterface.dropTable('jam_dinas_detail');
  }
};
