'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('adm_opd', {
      admopd_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      id_skpd: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      id_satker: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      id_bidang: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      kategori: {
        type: Sequelize.SMALLINT(3),
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('adm_opd');
  }
};
