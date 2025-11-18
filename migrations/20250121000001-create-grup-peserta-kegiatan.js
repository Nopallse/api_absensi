'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('grup_peserta_kegiatan', {
      id_grup_peserta: {
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
      nama_grup: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Nama grup peserta (contoh: OPD Dinas Pendidikan, Pejabat Eselon 2)'
      },
      jenis_grup: {
        type: Sequelize.ENUM('opd', 'khusus'),
        allowNull: false,
        defaultValue: 'khusus',
        comment: 'Jenis grup: opd = berdasarkan OPD, khusus = grup khusus'
      },
      id_satker: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Kode SKPD (hanya terisi jika jenis_grup = opd)'
      },
      keterangan: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Keterangan tambahan untuk grup'
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
    await queryInterface.addIndex('grup_peserta_kegiatan', ['id_kegiatan']);
    await queryInterface.addIndex('grup_peserta_kegiatan', ['lokasi_id']);
    await queryInterface.addIndex('grup_peserta_kegiatan', ['id_satker']);
    
    // Unique constraint: nama_grup harus unik per kombinasi id_kegiatan dan lokasi_id
    await queryInterface.addIndex('grup_peserta_kegiatan', ['id_kegiatan', 'lokasi_id', 'nama_grup'], {
      unique: true,
      name: 'unique_grup_per_kegiatan_lokasi'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('grup_peserta_kegiatan');
  }
};

