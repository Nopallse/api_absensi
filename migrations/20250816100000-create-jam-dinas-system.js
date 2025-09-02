'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create jam_dinas table
    await queryInterface.createTable('jam_dinas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false
      },
      hari_kerja: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        comment: 'Jumlah hari kerja dalam seminggu'
      },
      menit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Total menit kerja per hari'
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 1,
        comment: '1=aktif, 0=nonaktif'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create jam_dinas_detail table
    await queryInterface.createTable('jam_dinas_detail', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_jamdinas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'jam_dinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      hari: {
        type: Sequelize.ENUM('senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'),
        allowNull: false
      },
      tipe: {
        type: Sequelize.ENUM('normal', 'ramadhan'),
        allowNull: false,
        defaultValue: 'normal'
      },
      jam_masuk_mulai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam masuk'
      },
      jam_masuk_selesai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam masuk'
      },
      jam_pulang_mulai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu mulai jam pulang'
      },
      jam_pulang_selesai: {
        type: Sequelize.TIME,
        allowNull: false,
        comment: 'Waktu selesai jam pulang'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create dinas_setjam table
    await queryInterface.createTable('dinas_setjam', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Nama assignment jam dinas'
      },
      id_skpd: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID SKPD yang menggunakan jam dinas ini'
      },
      id_satker: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID Satker yang menggunakan jam dinas ini'
      },
      id_bidang: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'ID Bidang yang menggunakan jam dinas ini'
      },
      id_jamdinas: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'jam_dinas',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Referensi ke jam_dinas'
      },
      status: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 1,
        comment: '1=aktif, 0=nonaktif'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('jam_dinas_detail', ['id_jamdinas']);
    await queryInterface.addIndex('jam_dinas_detail', ['hari']);
    await queryInterface.addIndex('jam_dinas_detail', ['tipe']);
    
    await queryInterface.addIndex('dinas_setjam', ['id_jamdinas']);
    await queryInterface.addIndex('dinas_setjam', ['id_skpd']);
    await queryInterface.addIndex('dinas_setjam', ['id_satker']);
    await queryInterface.addIndex('dinas_setjam', ['id_bidang']);
    await queryInterface.addIndex('dinas_setjam', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('dinas_setjam');
    await queryInterface.dropTable('jam_dinas_detail');
    await queryInterface.dropTable('jam_dinas');
  }
};
