const { ViewDaftarUnitKerja, Lokasi } = require('../models');

async function populateLokasiData() {
  try {
    console.log('Memulai populate data lokasi...');

    // Ambil beberapa unit kerja untuk contoh
    const unitKerjaList = await ViewDaftarUnitKerja.findAll({
      where: { status: '1' },
      limit: 5,
      order: [['nm_unit_kerja', 'ASC']]
    });

    console.log(`Ditemukan ${unitKerjaList.length} unit kerja`);

    for (const unit of unitKerjaList) {
      // Tentukan level berdasarkan jenis
      let level = 1;
      if (unit.jenis === 'bidang_tbl') level = 2;
      if (unit.jenis === 'bidang_sub') level = 3;

      // Koordinat default untuk Pariaman (contoh)
      const defaultLat = -0.6267 + (Math.random() - 0.5) * 0.01;
      const defaultLng = 100.1207 + (Math.random() - 0.5) * 0.01;

      // Cek apakah sudah ada lokasi
      const existingLokasi = await Lokasi.findOne({
        where: { kd_unit_kerja: unit.kd_unit_kerja }
      });

      if (!existingLokasi) {
        await Lokasi.create({
          id_unit_kerja: unit.id_unit_kerja,
          kd_unit_kerja: unit.kd_unit_kerja,
          level_unit_kerja: level,
          lat: defaultLat,
          lng: defaultLng,
          range: 100,
          nama_lokasi: `Lokasi ${unit.nm_unit_kerja}`,
          alamat: `Alamat ${unit.nm_unit_kerja}, Pariaman`,
          ket: 'Lokasi contoh untuk testing',
          status: true,
          is_inherited: false,
          created_by: 'system'
        });

        console.log(`✓ Lokasi dibuat untuk ${unit.nm_unit_kerja}`);
      } else {
        console.log(`- Lokasi sudah ada untuk ${unit.nm_unit_kerja}`);
      }
    }

    console.log('Populate data lokasi selesai!');
    process.exit(0);
  } catch (error) {
    console.error('Error populate data lokasi:', error);
    process.exit(1);
  }
}

populateLokasiData();
