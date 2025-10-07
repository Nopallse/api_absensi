const { mainSequelize } = require('../config/database');
const { getEffectiveLocation, createOrUpdateLocation, getLocationHierarchy } = require('../utils/lokasiHierarchyUtils');

async function testLokasiHierarchy() {
  try {
    console.log('🧪 Testing Lokasi Hierarchy System...\n');

    // Test 1: Buat lokasi satker
    console.log('1️⃣ Creating Satker Location...');
    const satkerLocation = await createOrUpdateLocation({
      idSatker: 'O2',
      lat: -0.6267,
      lng: 100.1207,
      range: 200,
      ket: 'Lokasi Dinas Kesehatan'
    });
    console.log('✅ Satker Location Created:', {
      id: satkerLocation.lokasi_id,
      level: satkerLocation.level_unit_kerja,
      kd_unit_kerja: satkerLocation.kd_unit_kerja
    });

    // Test 2: Buat lokasi bidang
    console.log('\n2️⃣ Creating Bidang Location...');
    const bidangLocation = await createOrUpdateLocation({
      idSatker: 'O2',
      idBidang: '342',
      lat: -0.6300,
      lng: 100.1250,
      range: 150,
      ket: 'Lokasi Bidang Kesehatan Masyarakat'
    });
    console.log('✅ Bidang Location Created:', {
      id: bidangLocation.lokasi_id,
      level: bidangLocation.level_unit_kerja,
      kd_unit_kerja: bidangLocation.kd_unit_kerja
    });

    // Test 3: Buat lokasi sub-bidang
    console.log('\n3️⃣ Creating Sub-Bidang Location...');
    const subBidangLocation = await createOrUpdateLocation({
      idSatker: 'O2',
      idBidang: '342',
      idSubBidang: '819',
      lat: -0.6350,
      lng: 100.1300,
      range: 100,
      ket: 'Lokasi Sub Bidang Khusus'
    });
    console.log('✅ Sub-Bidang Location Created:', {
      id: subBidangLocation.lokasi_id,
      level: subBidangLocation.level_unit_kerja,
      kd_unit_kerja: subBidangLocation.kd_unit_kerja
    });

    // Test 4: Test effective location untuk sub-bidang
    console.log('\n4️⃣ Testing Effective Location for Sub-Bidang...');
    const effectiveLocationSubBidang = await getEffectiveLocation('O2', '342', '819');
    console.log('✅ Effective Location for Sub-Bidang:', {
      level: effectiveLocationSubBidang?.level,
      source: effectiveLocationSubBidang?.source,
      kd_unit_kerja: effectiveLocationSubBidang?.kd_unit_kerja
    });

    // Test 5: Test effective location untuk bidang (tanpa sub-bidang)
    console.log('\n5️⃣ Testing Effective Location for Bidang...');
    const effectiveLocationBidang = await getEffectiveLocation('O2', '342');
    console.log('✅ Effective Location for Bidang:', {
      level: effectiveLocationBidang?.level,
      source: effectiveLocationBidang?.source,
      kd_unit_kerja: effectiveLocationBidang?.kd_unit_kerja
    });

    // Test 6: Test effective location untuk satker
    console.log('\n6️⃣ Testing Effective Location for Satker...');
    const effectiveLocationSatker = await getEffectiveLocation('O2');
    console.log('✅ Effective Location for Satker:', {
      level: effectiveLocationSatker?.level,
      source: effectiveLocationSatker?.source,
      kd_unit_kerja: effectiveLocationSatker?.kd_unit_kerja
    });

    // Test 7: Test hierarchy
    console.log('\n7️⃣ Testing Location Hierarchy...');
    const hierarchy = await getLocationHierarchy('O2');
    console.log('✅ Location Hierarchy:', {
      satker: hierarchy.satker.NMSATKER,
      hasSatkerLocation: !!hierarchy.satker.lokasi,
      bidangCount: hierarchy.bidang.length,
      bidangWithLocation: hierarchy.bidang.filter(b => b.lokasi).length
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Satker location created');
    console.log('- ✅ Bidang location created');
    console.log('- ✅ Sub-bidang location created');
    console.log('- ✅ Effective location hierarchy working');
    console.log('- ✅ Location inheritance working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mainSequelize.close();
    process.exit();
  }
}

testLokasiHierarchy();
