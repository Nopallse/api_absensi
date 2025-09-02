'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('dinas_setjam', 'active_tipe', {
      type: Sequelize.STRING,
      defaultValue: 'normal',
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('dinas_setjam', 'active_tipe');
  }
};
