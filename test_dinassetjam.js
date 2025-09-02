const { DinasSetjam, JamDinas, JamDinasDetail } = require('./models');
const { Op } = require('sequelize');

async function findDinasSetjam() {
  try {
    console.log('Mencari DinasSetjam dengan:');
    console.log('SKPD: O29');
    console.log('Satker: O29');
    console.log('');
    
    // Pencarian pertama - dengan SKPD dan Satker
    const dinasSetjam1 = await DinasSetjam.findOne({
      where: {
        [Op.or]: [
          { id_skpd: 'O29' },
          { id_satker: 'O29' }
        ]
      },
      include: [
        {
          model: JamDinas,
          as: 'jamDinas',
          include: [
            {
              model: JamDinasDetail,
              as: 'details'
            }
          ]
        }
      ]
    });
    
    console.log('=== Hasil Pencarian 1 (SKPD/Satker) ===');
    if (dinasSetjam1) {
      console.log('DinasSetjam ditemukan:');
      console.log('ID:', dinasSetjam1.dinset_id);
      console.log('Nama:', dinasSetjam1.dinset_nama);
      console.log('id_skpd:', dinasSetjam1.id_skpd);
      console.log('id_satker:', dinasSetjam1.id_satker);
      console.log('id_bidang:', dinasSetjam1.id_bidang);
      console.log('id_jamdinas:', dinasSetjam1.id_jamdinas);
      console.log('');
      
      if (dinasSetjam1.jamDinas) {
        console.log('JamDinas:', dinasSetjam1.jamDinas.nama);
        console.log('Details count:', dinasSetjam1.jamDinas.details?.length || 0);
        if (dinasSetjam1.jamDinas.details?.length > 0) {
          console.log('Sample detail:', JSON.stringify(dinasSetjam1.jamDinas.details[0], null, 2));
        }
      }
    } else {
      console.log('Tidak ditemukan');
    }
    
    console.log('');
    
    // Pencarian kedua - dengan id_bidang null
    const dinasSetjam2 = await DinasSetjam.findOne({
      where: {
        [Op.or]: [
          { id_skpd: 'O29' },
          { id_satker: 'O29' }
        ],
        id_bidang: null
      },
      include: [
        {
          model: JamDinas,
          as: 'jamDinas',
          include: [
            {
              model: JamDinasDetail,
              as: 'details'
            }
          ]
        }
      ]
    });
    
    console.log('=== Hasil Pencarian 2 (SKPD/Satker + id_bidang null) ===');
    if (dinasSetjam2) {
      console.log('DinasSetjam ditemukan:');
      console.log('ID:', dinasSetjam2.dinset_id);
      console.log('Nama:', dinasSetjam2.dinset_nama);
      console.log('id_skpd:', dinasSetjam2.id_skpd);
      console.log('id_satker:', dinasSetjam2.id_satker);
      console.log('id_bidang:', dinasSetjam2.id_bidang);
      console.log('id_jamdinas:', dinasSetjam2.id_jamdinas);
      console.log('');
      
      if (dinasSetjam2.jamDinas) {
        console.log('JamDinas:', dinasSetjam2.jamDinas.nama);
        console.log('Details count:', dinasSetjam2.jamDinas.details?.length || 0);
        if (dinasSetjam2.jamDinas.details?.length > 0) {
          console.log('Sample detail:', JSON.stringify(dinasSetjam2.jamDinas.details[0], null, 2));
        }
      }
    } else {
      console.log('Tidak ditemukan');
    }
    
    console.log('');
    
    // Lihat semua DinasSetjam yang ada
    const allDinasSetjam = await DinasSetjam.findAll({
      include: [
        {
          model: JamDinas,
          as: 'jamDinas'
        }
      ]
    });
    
    console.log('=== Semua DinasSetjam ===');
    console.log('Total records:', allDinasSetjam.length);
    allDinasSetjam.forEach((item, index) => {
      console.log((index + 1) + '. ID: ' + item.dinset_id + ', Nama: ' + item.dinset_nama);
      console.log('   SKPD: ' + item.id_skpd + ', Satker: ' + item.id_satker + ', Bidang: ' + item.id_bidang);
      console.log('   JamDinas ID: ' + item.id_jamdinas + ', Nama: ' + (item.jamDinas?.nama || 'N/A'));
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findDinasSetjam();
