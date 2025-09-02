'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify adm_opd table fields to match master tables
    await queryInterface.changeColumn('adm_opd', 'id_skpd', {
      type: Sequelize.STRING(10),
      allowNull: false
    });
    
    await queryInterface.changeColumn('adm_opd', 'id_satker', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    
    await queryInterface.changeColumn('adm_opd', 'id_bidang', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes
    await queryInterface.changeColumn('adm_opd', 'id_skpd', {
      type: Sequelize.STRING(3),
      allowNull: false
    });
    
    await queryInterface.changeColumn('adm_opd', 'id_satker', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
    
    await queryInterface.changeColumn('adm_opd', 'id_bidang', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
