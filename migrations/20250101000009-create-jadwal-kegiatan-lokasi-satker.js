'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('jadwal_kegiatan_lokasi_satker', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_kegiatan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_jadwal_kegiatan',
          key: 'id_kegiatan'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID kegiatan dari master jadwal kegiatan'
      },
      lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'ID lokasi kegiatan'
      },
      id_satker: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Kode SKPD yang diarahkan ke lokasi ini'
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
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_kegiatan']);
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['lokasi_id']);
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_satker']);
    // Composite index for unique constraint or frequent queries
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_kegiatan', 'lokasi_id', 'id_satker'], {
      unique: true,
      name: 'unique_jadwal_kegiatan_lokasi_satker'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('jadwal_kegiatan_lokasi_satker');
  }
};

