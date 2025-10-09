'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Index untuk tabel MasterJadwalKegiatan
    await queryInterface.addIndex('master_jadwal_kegiatan', ['tanggal_kegiatan'], {
      name: 'idx_master_jadwal_kegiatan_tanggal'
    });

    // Index untuk tabel JadwalKegiatanLokasiSkpd
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_skpd', ['kdskpd'], {
      name: 'idx_jadwal_kegiatan_lokasi_skpd_kdskpd'
    });

    await queryInterface.addIndex('jadwal_kegiatan_lokasi_skpd', ['id_kegiatan'], {
      name: 'idx_jadwal_kegiatan_lokasi_skpd_id_kegiatan'
    });

    // Index untuk tabel Lokasi
    await queryInterface.addIndex('lokasi', ['id_satker', 'id_bidang', 'id_sub_bidang', 'status'], {
      name: 'idx_lokasi_hierarchy_status'
    });

    await queryInterface.addIndex('lokasi', ['status'], {
      name: 'idx_lokasi_status'
    });

    // Index untuk tabel MstPegawai
    await queryInterface.addIndex('mstpegawai', ['NIP'], {
      name: 'idx_mstpegawai_nip'
    });

    await queryInterface.addIndex('mstpegawai', ['KDSATKER'], {
      name: 'idx_mstpegawai_kdsatker'
    });

    await queryInterface.addIndex('mstpegawai', ['BIDANGF'], {
      name: 'idx_mstpegawai_bidangf'
    });

    // Index untuk tabel Kehadiran
    await queryInterface.addIndex('kehadiran', ['absen_nip', 'absen_tgl'], {
      name: 'idx_kehadiran_nip_tgl'
    });

    await queryInterface.addIndex('kehadiran', ['absen_tgl'], {
      name: 'idx_kehadiran_tgl'
    });

    // Index untuk tabel KehadiranKegiatan
    await queryInterface.addIndex('kehadiran_kegiatan', ['absen_nip', 'absen_tgl'], {
      name: 'idx_kehadiran_kegiatan_nip_tgl'
    });

    await queryInterface.addIndex('kehadiran_kegiatan', ['id_kegiatan'], {
      name: 'idx_kehadiran_kegiatan_id_kegiatan'
    });

    // Composite index untuk query yang sering digunakan
    await queryInterface.addIndex('master_jadwal_kegiatan', ['tanggal_kegiatan', 'jam_mulai'], {
      name: 'idx_master_jadwal_kegiatan_tanggal_jam'
    });

    await queryInterface.addIndex('jadwal_kegiatan_lokasi_skpd', ['id_kegiatan', 'kdskpd'], {
      name: 'idx_jadwal_kegiatan_lokasi_skpd_kegiatan_kdskpd'
    });
  },

  async down(queryInterface, Sequelize) {
    // Hapus semua index yang dibuat
    await queryInterface.removeIndex('master_jadwal_kegiatan', 'idx_master_jadwal_kegiatan_tanggal');
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_skpd', 'idx_jadwal_kegiatan_lokasi_skpd_kdskpd');
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_skpd', 'idx_jadwal_kegiatan_lokasi_skpd_id_kegiatan');
    await queryInterface.removeIndex('lokasi', 'idx_lokasi_hierarchy_status');
    await queryInterface.removeIndex('lokasi', 'idx_lokasi_status');
    await queryInterface.removeIndex('mstpegawai', 'idx_mstpegawai_nip');
    await queryInterface.removeIndex('mstpegawai', 'idx_mstpegawai_kdsatker');
    await queryInterface.removeIndex('mstpegawai', 'idx_mstpegawai_bidangf');
    await queryInterface.removeIndex('kehadiran', 'idx_kehadiran_nip_tgl');
    await queryInterface.removeIndex('kehadiran', 'idx_kehadiran_tgl');
    await queryInterface.removeIndex('kehadiran_kegiatan', 'idx_kehadiran_kegiatan_nip_tgl');
    await queryInterface.removeIndex('kehadiran_kegiatan', 'idx_kehadiran_kegiatan_id_kegiatan');
    await queryInterface.removeIndex('master_jadwal_kegiatan', 'idx_master_jadwal_kegiatan_tanggal_jam');
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_skpd', 'idx_jadwal_kegiatan_lokasi_skpd_kegiatan_kdskpd');
  }
};
