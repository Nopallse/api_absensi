'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom id_grup_peserta
    await queryInterface.addColumn('jadwal_kegiatan_lokasi_satker', 'id_grup_peserta', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'grup_peserta_kegiatan',
        key: 'id_grup_peserta'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'ID grup peserta (jika peserta berasal dari grup)'
    });

    // Add index untuk performa query
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_grup_peserta']);
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus index
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_satker', ['id_grup_peserta']);
    
    // Hapus kolom
    await queryInterface.removeColumn('jadwal_kegiatan_lokasi_satker', 'id_grup_peserta');
  }
};

