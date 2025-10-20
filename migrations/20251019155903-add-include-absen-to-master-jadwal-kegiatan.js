'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('master_jadwal_kegiatan', 'include_absen', {
      type: Sequelize.ENUM('none', 'pagi', 'sore', 'keduanya'),
      allowNull: false,
      defaultValue: 'none',
      comment: 'Ketentuan absen: none=Hanya kehadiran kegiatan, pagi=Menggantikan absen pagi, sore=Menggantikan absen sore, keduanya=Menggantikan absen pagi dan sore'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('master_jadwal_kegiatan', 'include_absen');
  }
};
