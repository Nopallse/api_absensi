'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('dinas_setjam', 'id_sub_bidang', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'ID Sub Bidang yang menggunakan jam dinas ini',
      after: 'id_bidang'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('dinas_setjam', 'id_sub_bidang');
  }
};
