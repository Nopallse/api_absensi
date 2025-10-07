const { ViewDaftarUnitKerja, Lokasi } = require('../models');
const { createOrUpdateLocation } = require('../utils/lokasiInheritanceUtils');

/**
 * Script untuk mengisi data lokasi berdasarkan unit kerja yang sudah ada
 * Lokasi akan dibuat dengan koordinat default dan bisa diupdate manual nanti
 */
const populateLokasiFromUnitKerja = async () => {
  try {
    console.log('🚀 Memulai proses pengisian data lokasi...');

    // Ambil semua unit kerja yang aktif
    const unitKerjaList = await ViewDaftarUnitKerja.findAll({
      where: { status: '1' },
      order: [['level_unit_kerja', 'ASC'], ['kd_unit_kerja', 'ASC']]
    });

    console.log(`📊 Ditemukan ${unitKerjaList.length} unit kerja`);

    let successCount = 0;
    let errorCount = 0;

    for (const unitKerja of unitKerjaList) {
      try {
        // Cek apakah sudah ada lokasi untuk unit kerja ini
        const existingLokasi = await Lokasi.findOne({
          where: {
            kd_unit_kerja: unitKerja.kd_unit_kerja,
            is_inherited: false
          }
        });

        if (existingLokasi) {
          console.log(`⏭️  Lokasi untuk ${unitKerja.kd_unit_kerja} sudah ada, dilewati`);
          continue;
        }

        // Tentukan koordinat default berdasarkan level
        let defaultLat, defaultLng, defaultRange, defaultNama;

        switch (unitKerja.jenis) {
          case 'satker_tbl':
            // Level 1 - Koordinat default untuk satker
            defaultLat = -0.6264; // Koordinat default Pariaman
            defaultLng = 100.1200;
            defaultRange = 500; // Radius 500m untuk satker
            defaultNama = `Lokasi ${unitKerja.nm_unit_kerja}`;
            break;
          case 'bidang_tbl':
            // Level 2 - Koordinat default untuk bidang
            defaultLat = -0.6264 + (Math.random() - 0.5) * 0.01; // Variasi kecil
            defaultLng = 100.1200 + (Math.random() - 0.5) * 0.01;
            defaultRange = 200; // Radius 200m untuk bidang
            defaultNama = `Lokasi ${unitKerja.nm_unit_kerja}`;
            break;
          case 'bidang_sub':
            // Level 3 - Koordinat default untuk sub bidang
            defaultLat = -0.6264 + (Math.random() - 0.5) * 0.005; // Variasi lebih kecil
            defaultLng = 100.1200 + (Math.random() - 0.5) * 0.005;
            defaultRange = 100; // Radius 100m untuk sub bidang
            defaultNama = `Lokasi ${unitKerja.nm_unit_kerja}`;
            break;
          default:
            defaultLat = -0.6264;
            defaultLng = 100.1200;
            defaultRange = 100;
            defaultNama = `Lokasi ${unitKerja.nm_unit_kerja}`;
        }

        // Buat lokasi
        const lokasiData = {
          kd_unit_kerja: unitKerja.kd_unit_kerja,
          lat: defaultLat,
          lng: defaultLng,
          range: defaultRange,
          nama_lokasi: defaultNama,
          alamat: `Alamat ${unitKerja.nm_unit_kerja}`,
          ket: `Lokasi default untuk ${unitKerja.nm_unit_kerja} (${unitKerja.jenis})`
        };

        await createOrUpdateLocation(lokasiData, 'system');
        
        console.log(`✅ Lokasi berhasil dibuat untuk ${unitKerja.kd_unit_kerja} - ${unitKerja.nm_unit_kerja}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error membuat lokasi untuk ${unitKerja.kd_unit_kerja}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Ringkasan:');
    console.log(`✅ Berhasil: ${successCount} lokasi`);
    console.log(`❌ Error: ${errorCount} lokasi`);
    console.log('🎉 Proses pengisian data lokasi selesai!');

  } catch (error) {
    console.error('💥 Error dalam proses pengisian data lokasi:', error);
  }
};

/**
 * Script untuk membersihkan data lokasi yang sudah ada
 */
const clearExistingLokasi = async () => {
  try {
    console.log('🧹 Membersihkan data lokasi yang sudah ada...');
    
    const deletedCount = await Lokasi.destroy({
      where: {},
      force: true // Hard delete
    });

    console.log(`🗑️  ${deletedCount} data lokasi berhasil dihapus`);
  } catch (error) {
    console.error('💥 Error membersihkan data lokasi:', error);
  }
};

// Export functions untuk digunakan di script lain
module.exports = {
  populateLokasiFromUnitKerja,
  clearExistingLokasi
};

// Jika script dijalankan langsung
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    clearExistingLokasi().then(() => {
      console.log('✅ Data lokasi berhasil dibersihkan');
      process.exit(0);
    });
  } else {
    populateLokasiFromUnitKerja().then(() => {
      console.log('✅ Script selesai dijalankan');
      process.exit(0);
    });
  }
}
