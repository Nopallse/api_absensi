'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Tambahkan kolom nip
    await queryInterface.addColumn('jadwal_kegiatan_lokasi_satker', 'nip', {
      type: Sequelize.STRING(30),
      allowNull: true,
      comment: 'NIP pegawai yang menjadi peserta kegiatan (opsional, jika entri berdasarkan individu)'
    });

    // Hapus unique constraint lama yang hanya berdasarkan id_kegiatan, lokasi_id, id_satker
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_satker', 'unique_jadwal_kegiatan_lokasi_satker');

    // Tambahkan index untuk kolom nip
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['nip']);

    // Tambahkan composite unique constraint baru yang mencakup nip
    // Note: Di MySQL/MariaDB, null values dianggap berbeda dalam unique constraint
    // Jadi constraint ini akan memastikan:
    // - Jika nip null: unique berdasarkan id_kegiatan, lokasi_id, id_satker
    // - Jika nip tidak null: unique berdasarkan id_kegiatan, lokasi_id, id_satker, nip
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_kegiatan', 'lokasi_id', 'id_satker', 'nip'], {
      unique: true,
      name: 'unique_jadwal_kegiatan_lokasi_satker_with_nip'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Hapus composite unique constraint baru
    await queryInterface.removeIndex('jadwal_kegiatan_lokasi_satker', 'unique_jadwal_kegiatan_lokasi_satker_with_nip');
    
    // Hapus index nip (coba beberapa nama index yang mungkin)
    const possibleIndexNames = [
      'jadwal_kegiatan_lokasi_satker_nip',
      'jadwal_kegiatan_lokasi_satker_nip_idx',
      'nip'
    ];
    
    for (const indexName of possibleIndexNames) {
      try {
        await queryInterface.removeIndex('jadwal_kegiatan_lokasi_satker', indexName);
        break; // Jika berhasil, keluar dari loop
      } catch (error) {
        // Lanjutkan ke nama index berikutnya
        continue;
      }
    }

    // Kembalikan unique constraint lama
    await queryInterface.addIndex('jadwal_kegiatan_lokasi_satker', ['id_kegiatan', 'lokasi_id', 'id_satker'], {
      unique: true,
      name: 'unique_jadwal_kegiatan_lokasi_satker'
    });

    // Hapus kolom nip
    await queryInterface.removeColumn('jadwal_kegiatan_lokasi_satker', 'nip');
  }
};

