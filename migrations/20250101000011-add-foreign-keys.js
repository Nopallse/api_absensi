'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Foreign key untuk jam_dinas_detail -> jam_dinas
    await queryInterface.addConstraint('jam_dinas_detail', {
      fields: ['id_jamdinas'],
      type: 'foreign key',
      name: 'fk_jam_dinas_detail_jam_dinas',
      references: {
        table: 'jam_dinas',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk dinas_setjam -> jam_dinas
    await queryInterface.addConstraint('dinas_setjam', {
      fields: ['id_jamdinas'],
      type: 'foreign key',
      name: 'fk_dinas_setjam_jam_dinas',
      references: {
        table: 'jam_dinas',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk kehadiran -> lokasi
    await queryInterface.addConstraint('kehadiran', {
      fields: ['lokasi_id'],
      type: 'foreign key',
      name: 'fk_kehadiran_lokasi',
      references: {
        table: 'lokasi',
        field: 'lokasi_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk jadwal_kegiatan_lokasi_skpd -> master_jadwal_kegiatan
    await queryInterface.addConstraint('jadwal_kegiatan_lokasi_skpd', {
      fields: ['id_kegiatan'],
      type: 'foreign key',
      name: 'fk_jadwal_kegiatan_lokasi_skpd_kegiatan',
      references: {
        table: 'master_jadwal_kegiatan',
        field: 'id_kegiatan'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk jadwal_kegiatan_lokasi_skpd -> lokasi
    await queryInterface.addConstraint('jadwal_kegiatan_lokasi_skpd', {
      fields: ['lokasi_id'],
      type: 'foreign key',
      name: 'fk_jadwal_kegiatan_lokasi_skpd_lokasi',
      references: {
        table: 'lokasi',
        field: 'lokasi_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk adm_opd -> user
    await queryInterface.addConstraint('adm_opd', {
      fields: ['id_user'],
      type: 'foreign key',
      name: 'fk_adm_opd_user',
      references: {
        table: 'user',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Foreign key untuk adm_upt -> user
    await queryInterface.addConstraint('adm_upt', {
      fields: ['id_user'],
      type: 'foreign key',
      name: 'fk_adm_upt_user',
      references: {
        table: 'user',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop foreign key constraints
    await queryInterface.removeConstraint('jam_dinas_detail', 'fk_jam_dinas_detail_jam_dinas');
    await queryInterface.removeConstraint('dinas_setjam', 'fk_dinas_setjam_jam_dinas');
    await queryInterface.removeConstraint('kehadiran', 'fk_kehadiran_lokasi');
    await queryInterface.removeConstraint('jadwal_kegiatan_lokasi_skpd', 'fk_jadwal_kegiatan_lokasi_skpd_kegiatan');
    await queryInterface.removeConstraint('jadwal_kegiatan_lokasi_skpd', 'fk_jadwal_kegiatan_lokasi_skpd_lokasi');
    await queryInterface.removeConstraint('adm_opd', 'fk_adm_opd_user');
    await queryInterface.removeConstraint('adm_upt', 'fk_adm_upt_user');
  }
};
