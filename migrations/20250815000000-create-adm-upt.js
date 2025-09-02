'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('adm_upt', {
      admupt_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_user: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'user',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      },
      umum: {
        type: Sequelize.STRING,
        allowNull: true
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('adm_upt');
  }
};
