'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('peserta_grup_kegiatan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_grup_peserta: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'grup_peserta_kegiatan',
          key: 'id_grup_peserta'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID grup peserta kegiatan'
      },
      nip: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'NIP pegawai yang menjadi peserta dalam grup'
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

    // Add indexes for better performance
    await queryInterface.addIndex('peserta_grup_kegiatan', ['id_grup_peserta']);
    await queryInterface.addIndex('peserta_grup_kegiatan', ['nip']);
    
    // Unique constraint: NIP harus unik per grup
    await queryInterface.addIndex('peserta_grup_kegiatan', ['id_grup_peserta', 'nip'], {
      unique: true,
      name: 'unique_peserta_grup'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('peserta_grup_kegiatan');
  }
};

