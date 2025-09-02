'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Alter table lokasi to change id_skpd and id_satker from INTEGER to VARCHAR
    await queryInterface.changeColumn('lokasi', 'id_skpd', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.changeColumn('lokasi', 'id_satker', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.changeColumn('lokasi', 'id_bidang', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to INTEGER if needed
    await queryInterface.changeColumn('lokasi', 'id_skpd', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    
    await queryInterface.changeColumn('lokasi', 'id_satker', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.changeColumn('lokasi', 'id_bidang', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  }
};
