'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('skpd_lokasi', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      kdskpd: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Kode SKPD dari database master'
      },
      lokasi_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Tambahkan index untuk optimasi query
    await queryInterface.addIndex('skpd_lokasi', ['kdskpd']);
    await queryInterface.addIndex('skpd_lokasi', ['lokasi_id']);
    await queryInterface.addIndex('skpd_lokasi', ['kdskpd', 'lokasi_id'], {
      unique: true,
      name: 'skpd_lokasi_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('skpd_lokasi');
  }
}; 