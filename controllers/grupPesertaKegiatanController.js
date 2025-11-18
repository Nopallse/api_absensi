const { GrupPesertaKegiatan, PesertaGrupKegiatan, MasterJadwalKegiatan, Lokasi, JadwalKegiatanLokasiSatker, MstPegawai, SatkerTbl, KehadiranKegiatan } = require('../models');
const { Op, Sequelize } = require('sequelize');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'grup-peserta-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file Excel (.xlsx, .xls) yang diizinkan'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// GET: Dapatkan semua grup peserta untuk kegiatan dan lokasi
const getAllGrupPeserta = async (req, res) => {
  try {
    const { id_kegiatan, lokasi_id } = req.params;
    
    const whereClause = {
      id_kegiatan: parseInt(id_kegiatan)
    };
    
    if (lokasi_id) {
      whereClause.lokasi_id = parseInt(lokasi_id);
    }
    
    const grupList = await GrupPesertaKegiatan.findAll({
      where: whereClause,
      include: [
        {
          model: Lokasi,
          attributes: ['lokasi_id', 'ket', 'lat', 'lng']
        },
        {
          model: MasterJadwalKegiatan,
          attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
        },
        {
          model: PesertaGrupKegiatan,
          as: 'peserta',
          attributes: ['id', 'nip'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Hitung jumlah peserta per grup
    const grupWithCount = await Promise.all(
      grupList.map(async (grup) => {
        const pesertaCount = await PesertaGrupKegiatan.count({
          where: { id_grup_peserta: grup.id_grup_peserta }
        });
        
        return {
          ...grup.toJSON(),
          total_peserta: pesertaCount
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: grupWithCount,
      total: grupWithCount.length
    });
  } catch (error) {
    console.error('Get All Grup Peserta Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET: Dapatkan detail grup peserta
const getGrupPesertaById = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta, {
      include: [
        {
          model: Lokasi,
          attributes: ['lokasi_id', 'ket', 'lat', 'lng']
        },
        {
          model: MasterJadwalKegiatan,
          attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
        },
        {
          model: PesertaGrupKegiatan,
          as: 'peserta',
          attributes: ['id', 'nip'],
          required: false
        }
      ]
    });
    
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    const pesertaCount = await PesertaGrupKegiatan.count({
      where: { id_grup_peserta: grup.id_grup_peserta }
    });
    
    res.status(200).json({
      success: true,
      data: {
        ...grup.toJSON(),
        total_peserta: pesertaCount
      }
    });
  } catch (error) {
    console.error('Get Grup Peserta By ID Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST: Buat grup peserta baru (dengan support multiple lokasi)
const createGrupPeserta = async (req, res) => {
  try {
    const { id_kegiatan } = req.params;
    const { nama_grup, jenis_grup, id_satker, keterangan, lokasi_ids } = req.body;
    
    // Support both old format (lokasi_id from params) and new format (lokasi_ids from body)
    let lokasiIdList = [];
    if (lokasi_ids && Array.isArray(lokasi_ids) && lokasi_ids.length > 0) {
      // New format: multiple lokasi from body
      lokasiIdList = lokasi_ids.map(id => parseInt(id));
    } else if (req.params.lokasi_id) {
      // Old format: single lokasi from params (backward compatibility)
      lokasiIdList = [parseInt(req.params.lokasi_id)];
    } else {
      return res.status(400).json({
        success: false,
        error: 'Lokasi harus dipilih (minimal 1 lokasi)'
      });
    }
    
    // Validasi input
    if (!nama_grup || !jenis_grup) {
      return res.status(400).json({
        success: false,
        error: 'Nama grup dan jenis grup wajib diisi'
      });
    }
    
    if (jenis_grup !== 'opd' && jenis_grup !== 'khusus') {
      return res.status(400).json({
        success: false,
        error: 'Jenis grup harus "opd" atau "khusus"'
      });
    }
    
    if (jenis_grup === 'opd' && !id_satker) {
      return res.status(400).json({
        success: false,
        error: 'id_satker wajib diisi jika jenis_grup = "opd"'
      });
    }
    
    const kegiatanId = parseInt(id_kegiatan);
    
    // Cek apakah kegiatan ada
    const kegiatan = await MasterJadwalKegiatan.findByPk(kegiatanId);
    if (!kegiatan) {
      return res.status(404).json({
        success: false,
        error: 'Jadwal kegiatan tidak ditemukan'
      });
    }
    
    // Validasi semua lokasi
    const lokasiList = await Lokasi.findAll({
      where: {
        lokasi_id: { [Op.in]: lokasiIdList }
      }
    });
    
    if (lokasiList.length !== lokasiIdList.length) {
      return res.status(400).json({
        success: false,
        error: 'Beberapa lokasi tidak ditemukan'
      });
    }
    
    // Cek apakah nama grup sudah ada untuk kombinasi kegiatan + lokasi (untuk setiap lokasi)
    const existingGrups = await GrupPesertaKegiatan.findAll({
      where: {
        id_kegiatan: kegiatanId,
        lokasi_id: { [Op.in]: lokasiIdList },
        nama_grup: nama_grup
      }
    });
    
    if (existingGrups.length > 0) {
      const existingLokasiIds = existingGrups.map(g => g.lokasi_id);
      return res.status(400).json({
        success: false,
        error: `Nama grup "${nama_grup}" sudah ada untuk lokasi: ${existingLokasiIds.join(', ')}`
      });
    }
    
    const sequelize = GrupPesertaKegiatan.sequelize;
    const transaction = await sequelize.transaction();
    
    try {
      const createdGrups = [];
      
      // Buat grup untuk setiap lokasi
      for (const lokasiId of lokasiIdList) {
        const newGrup = await GrupPesertaKegiatan.create({
          id_kegiatan: kegiatanId,
          lokasi_id: lokasiId,
          nama_grup: nama_grup,
          jenis_grup: jenis_grup,
          id_satker: jenis_grup === 'opd' ? id_satker : null,
          keterangan: keterangan || null
        }, { transaction });
        
        createdGrups.push(newGrup);
      }
      
      // Jika jenis grup adalah 'opd', otomatis tambahkan semua anggota satker ke setiap grup
      if (jenis_grup === 'opd' && id_satker) {
        try {
          // Ambil semua pegawai aktif dari satker
          // Tidak menggunakan transaction karena MstPegawai menggunakan masterSequelize (database berbeda)
          const pegawaiSatker = await MstPegawai.findAll({
            where: {
              KDSATKER: id_satker,
              STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'KDSATKER']
          });
          
          const nipList = pegawaiSatker.map(p => p.NIP);
          
          // Untuk setiap grup yang dibuat, tambahkan peserta
          for (const newGrup of createdGrups) {
            const lokasiId = newGrup.lokasi_id;
            
            // Hapus entry dummy dengan id_satker = 'NO_SATKER' jika ada
            await JadwalKegiatanLokasiSatker.destroy({
              where: {
                id_kegiatan: kegiatanId,
                lokasi_id: lokasiId,
                id_satker: 'NO_SATKER'
              },
              transaction
            });
            
            const addedPeserta = [];
            const failedNip = [];
            const existingNip = [];
            
            // Tambahkan setiap pegawai ke grup
            for (const nip of nipList) {
              try {
                // Cek apakah NIP sudah ada di grup
                const existing = await PesertaGrupKegiatan.findOne({
                  where: {
                    id_grup_peserta: newGrup.id_grup_peserta,
                    nip: nip
                  },
                  transaction
                });
                
                if (existing) {
                  existingNip.push(nip);
                  continue;
                }
                
                // Cari data pegawai untuk mendapatkan KDSATKER
                const pegawai = pegawaiSatker.find(p => p.NIP === nip);
                
                if (!pegawai) {
                  failedNip.push({ nip, reason: 'Data pegawai tidak ditemukan' });
                  continue;
                }
                
                // Tambahkan peserta ke grup
                const peserta = await PesertaGrupKegiatan.create({
                  id_grup_peserta: newGrup.id_grup_peserta,
                  nip: nip
                }, { transaction });
                
                // Sync ke jadwal_kegiatan_lokasi_satker
                await JadwalKegiatanLokasiSatker.create({
                  id_kegiatan: kegiatanId,
                  lokasi_id: lokasiId,
                  id_satker: pegawai.KDSATKER,
                  nip: nip,
                  id_grup_peserta: newGrup.id_grup_peserta
                }, { transaction });
                
                addedPeserta.push(peserta);
              } catch (error) {
                console.error(`Error adding NIP ${nip}:`, error.message);
                failedNip.push({ nip, reason: error.message });
              }
            }
            
            console.log(`Auto-added ${addedPeserta.length} participants from satker ${id_satker} to grup ${newGrup.id_grup_peserta} (lokasi ${lokasiId})`);
          }
        } catch (error) {
          console.error('Error auto-adding participants:', error);
          // Tidak throw error, karena grup sudah berhasil dibuat
        }
      }
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: jenis_grup === 'opd' 
          ? `Grup peserta berhasil dibuat untuk ${createdGrups.length} lokasi dan anggota satker otomatis ditambahkan`
          : `Grup peserta berhasil dibuat untuk ${createdGrups.length} lokasi`,
        data: {
          created_grups: createdGrups,
          total_lokasi: createdGrups.length
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create Grup Peserta Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// PUT: Update grup peserta
const updateGrupPeserta = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    const { nama_grup, keterangan } = req.body;
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    // Cek apakah nama grup sudah ada (jika diubah)
    if (nama_grup && nama_grup !== grup.nama_grup) {
      const existingGrup = await GrupPesertaKegiatan.findOne({
        where: {
          id_kegiatan: grup.id_kegiatan,
          lokasi_id: grup.lokasi_id,
          nama_grup: nama_grup,
          id_grup_peserta: { [Op.ne]: id_grup_peserta }
        }
      });
      
      if (existingGrup) {
        return res.status(400).json({
          success: false,
          error: 'Nama grup sudah ada untuk kegiatan dan lokasi ini'
        });
      }
    }
    
    await grup.update({
      nama_grup: nama_grup || grup.nama_grup,
      keterangan: keterangan !== undefined ? keterangan : grup.keterangan
    });
    
    res.status(200).json({
      success: true,
      message: 'Grup peserta berhasil diupdate',
      data: grup
    });
  } catch (error) {
    console.error('Update Grup Peserta Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// DELETE: Hapus grup peserta
const deleteGrupPeserta = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    // Hapus grup (cascade akan menghapus semua peserta di grup)
    await grup.destroy();
    
    res.status(200).json({
      success: true,
      message: 'Grup peserta berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete Grup Peserta Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET: Dapatkan semua peserta dalam grup
const getPesertaGrup = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    const pesertaList = await PesertaGrupKegiatan.findAll({
      where: { id_grup_peserta: parseInt(id_grup_peserta) },
      attributes: ['id', 'nip', 'created_at']
    });
    
    // Dapatkan data pegawai untuk setiap NIP
    const nipList = pesertaList.map(p => p.nip);
    const pegawaiList = await MstPegawai.findAll({
      where: {
        NIP: { [Op.in]: nipList },
        STATUSAKTIF: 'AKTIF'
      },
      attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER']
    });
    
    // Mapping NIP ke data pegawai
    const pegawaiMap = {};
    pegawaiList.forEach(p => {
      pegawaiMap[p.NIP] = {
        nip: p.NIP,
        nama: p.NAMA,
        nama_lengkap: `${p.GLRDEPAN || ''} ${p.NAMA} ${p.GLRBELAKANG || ''}`.trim(),
        kdsatker: p.KDSATKER
      };
    });
    
    // Gabungkan data peserta dengan data pegawai
    const pesertaWithPegawai = pesertaList.map(p => ({
      id: p.id,
      nip: p.nip,
      pegawai: pegawaiMap[p.nip] || null,
      created_at: p.created_at
    }));
    
    res.status(200).json({
      success: true,
      data: {
        grup: {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          jenis_grup: grup.jenis_grup
        },
        peserta: pesertaWithPegawai,
        total: pesertaWithPegawai.length
      }
    });
  } catch (error) {
    console.error('Get Peserta Grup Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST: Tambahkan peserta ke grup
const addPesertaToGrup = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    const { nip_list, bulk_from_satker } = req.body;
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    const sequelize = GrupPesertaKegiatan.sequelize;
    const transaction = await sequelize.transaction();
    
    try {
      let nipToAdd = [];
      const addedPeserta = [];
      const failedNip = [];
      const existingNip = [];
      
      // Jika bulk_from_satker = true dan jenis_grup = 'opd'
      if (bulk_from_satker && grup.jenis_grup === 'opd' && grup.id_satker) {
        // Ambil semua pegawai aktif dari satker
        // Tidak menggunakan transaction karena MstPegawai menggunakan masterSequelize (database berbeda)
        const pegawaiSatker = await MstPegawai.findAll({
          where: {
            KDSATKER: grup.id_satker,
            STATUSAKTIF: 'AKTIF'
          },
          attributes: ['NIP']
        });
        
        nipToAdd = pegawaiSatker.map(p => p.NIP);
      } else if (nip_list && Array.isArray(nip_list) && nip_list.length > 0) {
        // Tambahkan dari nip_list
        nipToAdd = nip_list;
      } else {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'nip_list (array) harus diisi atau bulk_from_satker = true untuk grup OPD'
        });
      }
      
      // Hapus entry dummy dengan id_satker = 'NO_SATKER' jika ada
      // Entry dummy dibuat saat lokasi ditambahkan tanpa peserta
      await JadwalKegiatanLokasiSatker.destroy({
        where: {
          id_kegiatan: grup.id_kegiatan,
          lokasi_id: grup.lokasi_id,
          id_satker: 'NO_SATKER'
        },
        transaction
      });
      
      // Validasi dan tambahkan setiap NIP
      for (const nip of nipToAdd) {
        try {
          // Cek apakah NIP sudah ada di grup
          const existing = await PesertaGrupKegiatan.findOne({
            where: {
              id_grup_peserta: parseInt(id_grup_peserta),
              nip: nip
            },
            transaction
          });
          
          if (existing) {
            existingNip.push(nip);
            continue;
          }
          
          // Cek apakah NIP valid (ada di database pegawai)
          // Tidak menggunakan transaction karena MstPegawai menggunakan masterSequelize (database berbeda)
          const pegawai = await MstPegawai.findOne({
            where: {
              NIP: nip,
              STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'KDSATKER']
          });
          
          if (!pegawai) {
            failedNip.push({ nip, reason: 'NIP tidak ditemukan atau pegawai tidak aktif' });
            continue;
          }
          
          // Tambahkan peserta ke grup
          const peserta = await PesertaGrupKegiatan.create({
            id_grup_peserta: parseInt(id_grup_peserta),
            nip: nip
          }, { transaction });
          
          // Sync ke jadwal_kegiatan_lokasi_satker
          await JadwalKegiatanLokasiSatker.create({
            id_kegiatan: grup.id_kegiatan,
            lokasi_id: grup.lokasi_id,
            id_satker: pegawai.KDSATKER,
            nip: nip,
            id_grup_peserta: grup.id_grup_peserta
          }, { transaction });
          
          addedPeserta.push(peserta);
        } catch (error) {
          console.error(`Error adding NIP ${nip}:`, error.message);
          failedNip.push({ nip, reason: error.message });
        }
      }
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: `Berhasil menambahkan ${addedPeserta.length} peserta ke grup`,
        data: {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          peserta_added: addedPeserta.length,
          peserta_list: addedPeserta.map(p => p.nip),
          existing_nip: existingNip.length > 0 ? existingNip : undefined,
          failed_nip: failedNip.length > 0 ? failedNip : undefined
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Add Peserta To Grup Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// POST: Import peserta dari Excel
const importPesertaFromExcel = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'File Excel wajib diupload'
      });
    }
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      // Hapus file yang sudah diupload
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    // Baca file Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    
    const worksheet = workbook.getWorksheet(1); // Ambil sheet pertama
    if (!worksheet) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'File Excel tidak memiliki sheet'
      });
    }
    
    // Baca data dari Excel (kolom pertama = NIP)
    const nipList = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // Skip header
        return;
      }
      
      const nip = row.getCell(1).value;
      if (nip && typeof nip === 'string' && nip.trim()) {
        nipList.push(nip.trim());
      }
    });
    
    // Hapus file setelah dibaca
    fs.unlinkSync(req.file.path);
    
    if (nipList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tidak ada NIP yang ditemukan di file Excel'
      });
    }
    
    // Tambahkan peserta menggunakan fungsi addPesertaToGrup
    req.body.nip_list = nipList;
    req.body.bulk_from_satker = false;
    
    // Panggil addPesertaToGrup secara internal
    const sequelize = GrupPesertaKegiatan.sequelize;
    const transaction = await sequelize.transaction();
    
    try {
      // Hapus entry dummy dengan id_satker = 'NO_SATKER' jika ada
      // Entry dummy dibuat saat lokasi ditambahkan tanpa peserta
      await JadwalKegiatanLokasiSatker.destroy({
        where: {
          id_kegiatan: grup.id_kegiatan,
          lokasi_id: grup.lokasi_id,
          id_satker: 'NO_SATKER'
        },
        transaction
      });
      
      const addedPeserta = [];
      const failedNip = [];
      const existingNip = [];
      
      for (const nip of nipList) {
        try {
          // Cek apakah NIP sudah ada di grup
          const existing = await PesertaGrupKegiatan.findOne({
            where: {
              id_grup_peserta: parseInt(id_grup_peserta),
              nip: nip
            },
            transaction
          });
          
          if (existing) {
            existingNip.push(nip);
            continue;
          }
          
          // Cek apakah NIP valid
          // Tidak menggunakan transaction karena MstPegawai menggunakan masterSequelize (database berbeda)
          const pegawai = await MstPegawai.findOne({
            where: {
              NIP: nip,
              STATUSAKTIF: 'AKTIF'
            },
            attributes: ['NIP', 'KDSATKER']
          });
          
          if (!pegawai) {
            failedNip.push({ nip, reason: 'NIP tidak ditemukan atau pegawai tidak aktif' });
            continue;
          }
          
          // Tambahkan peserta ke grup
          const peserta = await PesertaGrupKegiatan.create({
            id_grup_peserta: parseInt(id_grup_peserta),
            nip: nip
          }, { transaction });
          
          // Sync ke jadwal_kegiatan_lokasi_satker
          await JadwalKegiatanLokasiSatker.create({
            id_kegiatan: grup.id_kegiatan,
            lokasi_id: grup.lokasi_id,
            id_satker: pegawai.KDSATKER,
            nip: nip,
            id_grup_peserta: grup.id_grup_peserta
          }, { transaction });
          
          addedPeserta.push(peserta);
        } catch (error) {
          console.error(`Error adding NIP ${nip}:`, error.message);
          failedNip.push({ nip, reason: error.message });
        }
      }
      
      await transaction.commit();
      
      res.status(201).json({
        success: true,
        message: `Berhasil mengimport ${addedPeserta.length} peserta dari Excel`,
        data: {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          peserta_added: addedPeserta.length,
          peserta_list: addedPeserta.map(p => p.nip),
          existing_nip: existingNip.length > 0 ? existingNip : undefined,
          failed_nip: failedNip.length > 0 ? failedNip : undefined,
          total_in_file: nipList.length
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    // Hapus file jika masih ada
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Import Peserta From Excel Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// DELETE: Hapus peserta dari grup
const removePesertaFromGrup = async (req, res) => {
  try {
    const { id_grup_peserta } = req.params;
    const { nip_list } = req.body;
    
    if (!nip_list || !Array.isArray(nip_list) || nip_list.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'nip_list (array) wajib diisi'
      });
    }
    
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta);
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    const sequelize = GrupPesertaKegiatan.sequelize;
    const transaction = await sequelize.transaction();
    
    try {
      // Hapus peserta dari grup
      const deletedCount = await PesertaGrupKegiatan.destroy({
        where: {
          id_grup_peserta: parseInt(id_grup_peserta),
          nip: { [Op.in]: nip_list }
        },
        transaction
      });
      
      // Hapus dari jadwal_kegiatan_lokasi_satker juga
      await JadwalKegiatanLokasiSatker.destroy({
        where: {
          id_kegiatan: grup.id_kegiatan,
          lokasi_id: grup.lokasi_id,
          id_grup_peserta: grup.id_grup_peserta,
          nip: { [Op.in]: nip_list }
        },
        transaction
      });
      
      await transaction.commit();
      
      res.status(200).json({
        success: true,
        message: `Berhasil menghapus ${deletedCount} peserta dari grup`,
        data: {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          deleted_count: deletedCount
        }
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Remove Peserta From Grup Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET: Dapatkan semua grup peserta untuk kegiatan dengan data kehadiran
const getAllGrupPesertaKegiatan = async (req, res) => {
  try {
    const { id_kegiatan } = req.params;
    
    // Ambil semua grup peserta untuk kegiatan ini
    const grupList = await GrupPesertaKegiatan.findAll({
      where: {
        id_kegiatan: parseInt(id_kegiatan)
      },
      include: [
        {
          model: Lokasi,
          attributes: ['lokasi_id', 'ket', 'lat', 'lng']
        },
        {
          model: MasterJadwalKegiatan,
          attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Untuk setiap grup, hitung total peserta dan kehadiran
    const grupWithStats = await Promise.all(
      grupList.map(async (grup) => {
        // Hitung total peserta
        const pesertaList = await PesertaGrupKegiatan.findAll({
          where: { id_grup_peserta: grup.id_grup_peserta },
          attributes: ['nip']
        });
        
        const nipList = pesertaList.map(p => p.nip);
        const totalPeserta = nipList.length;
        
        // Hitung kehadiran
        let totalKehadiran = 0;
        if (nipList.length > 0) {
          const kehadiranData = await KehadiranKegiatan.findAll({
            where: {
              id_kegiatan: parseInt(id_kegiatan),
              absen_nip: { [Op.in]: nipList }
            },
            attributes: ['absen_nip']
          });
          totalKehadiran = kehadiranData.length;
        }
        
        // Dapatkan nama satker jika jenis_grup = 'opd'
        let namaSatker = null;
        if (grup.jenis_grup === 'opd' && grup.id_satker) {
          const satker = await SatkerTbl.findOne({
            where: { KDSATKER: grup.id_satker },
            attributes: ['NMSATKER']
          });
          if (satker) {
            namaSatker = satker.NMSATKER;
          }
        }
        
        return {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          jenis_grup: grup.jenis_grup,
          id_satker: grup.id_satker,
          nama_satker: namaSatker,
          lokasi: grup.Lokasi ? {
            lokasi_id: grup.Lokasi.lokasi_id,
            ket: grup.Lokasi.ket
          } : null,
          total_pegawai: totalPeserta,
          total_kehadiran: totalKehadiran,
          keterangan: grup.keterangan
        };
      })
    );
    
    // Gabungkan grup dengan nama yang sama (khususnya untuk jenis OPD dengan id_satker yang sama)
    const mergedGroups = {};
    
    grupWithStats.forEach(grup => {
      // Key untuk grouping: nama_grup + jenis_grup + id_satker (untuk OPD)
      const groupKey = grup.jenis_grup === 'opd' && grup.id_satker
        ? `${grup.nama_grup}_${grup.jenis_grup}_${grup.id_satker}`
        : `${grup.nama_grup}_${grup.jenis_grup}_${grup.id_grup_peserta}`; // Untuk grup khusus, tetap unik per grup
      
      if (!mergedGroups[groupKey]) {
        mergedGroups[groupKey] = {
          id_grup_peserta: grup.id_grup_peserta, // Ambil id pertama sebagai representasi
          nama_grup: grup.nama_grup,
          jenis_grup: grup.jenis_grup,
          id_satker: grup.id_satker,
          nama_satker: grup.nama_satker,
          lokasi: [grup.lokasi].filter(l => l !== null), // Array lokasi
          total_pegawai: grup.total_pegawai,
          total_kehadiran: grup.total_kehadiran,
          keterangan: grup.keterangan,
          id_grup_list: [grup.id_grup_peserta] // List semua id grup yang digabung
        };
      } else {
        // Gabungkan data
        mergedGroups[groupKey].total_pegawai += grup.total_pegawai;
        mergedGroups[groupKey].total_kehadiran += grup.total_kehadiran;
        if (grup.lokasi && !mergedGroups[groupKey].lokasi.find(l => l && l.lokasi_id === grup.lokasi.lokasi_id)) {
          mergedGroups[groupKey].lokasi.push(grup.lokasi);
        }
        if (!mergedGroups[groupKey].id_grup_list.includes(grup.id_grup_peserta)) {
          mergedGroups[groupKey].id_grup_list.push(grup.id_grup_peserta);
        }
      }
    });
    
    // Convert object ke array
    const finalGroups = Object.values(mergedGroups);
    
    res.status(200).json({
      success: true,
      data: finalGroups,
      total: finalGroups.length
    });
  } catch (error) {
    console.error('Get All Grup Peserta Kegiatan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET: Dapatkan detail grup peserta dengan data kehadiran
const getDetailGrupPesertaKegiatan = async (req, res) => {
  try {
    const { id_kegiatan, id_grup_peserta } = req.params;
    
    // Ambil detail grup
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta, {
      include: [
        {
          model: Lokasi,
          attributes: ['lokasi_id', 'ket', 'lat', 'lng']
        },
        {
          model: MasterJadwalKegiatan,
          attributes: ['id_kegiatan', 'tanggal_kegiatan', 'jenis_kegiatan', 'keterangan']
        }
      ]
    });
    
    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }
    
    // Ambil semua peserta dalam grup
    const pesertaList = await PesertaGrupKegiatan.findAll({
      where: { id_grup_peserta: parseInt(id_grup_peserta) },
      attributes: ['id', 'nip', 'created_at']
    });
    
    // Dapatkan data pegawai untuk setiap NIP
    const nipList = pesertaList.map(p => p.nip).filter(Boolean);
    const pegawaiList = await MstPegawai.findAll({
      where: {
        NIP: { [Op.in]: nipList },
        STATUSAKTIF: 'AKTIF'
      },
      attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER']
    });
    
    // Dapatkan data kehadiran untuk kegiatan ini
    const kehadiranList = await KehadiranKegiatan.findAll({
      where: {
        id_kegiatan: parseInt(id_kegiatan),
        absen_nip: { [Op.in]: nipList }
      },
      attributes: ['absen_nip', 'absen_tgljam']
    });
    
    // Mapping kehadiran berdasarkan NIP
    const kehadiranMap = {};
    kehadiranList.forEach(k => {
      kehadiranMap[k.absen_nip] = {
        absen_tgljam: k.absen_tgljam
      };
    });
    
    // Mapping NIP ke data pegawai
    const pegawaiMap = {};
    pegawaiList.forEach(p => {
      pegawaiMap[p.NIP] = {
        nip: p.NIP,
        nama: p.NAMA,
        nama_lengkap: `${p.GLRDEPAN || ''} ${p.NAMA} ${p.GLRBELAKANG || ''}`.trim(),
        kdsatker: p.KDSATKER
      };
    });
    
    // Gabungkan data peserta dengan data pegawai dan kehadiran
    const pegawaiWithKehadiran = pesertaList.map(p => {
      const pegawai = pegawaiMap[p.nip] || {
        nip: p.nip,
        nama: p.nip,
        nama_lengkap: p.nip,
        kdsatker: null
      };
      const kehadiran = kehadiranMap[p.nip] || null;
      
      return {
        nip: pegawai.nip,
        nama: pegawai.nama,
        nama_lengkap: pegawai.nama_lengkap,
        hadir: kehadiran !== null,
        kehadiran_data: kehadiran
      };
    });
    
    // Hitung statistik
    const totalPegawai = pegawaiWithKehadiran.length;
    const totalHadir = pegawaiWithKehadiran.filter(p => p.hadir).length;
    const totalTidakHadir = totalPegawai - totalHadir;
    const persentase = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;
    
    // Dapatkan nama satker jika jenis grup OPD
    let namaSatker = null;
    if (grup.jenis_grup === 'opd' && grup.id_satker) {
      const satker = await SatkerTbl.findOne({
        where: { KDSATKER: grup.id_satker },
        attributes: ['NMSATKER']
      });
      namaSatker = satker ? satker.NMSATKER : null;
    }
    
    res.status(200).json({
      success: true,
      data: {
        grup: {
          id_grup_peserta: grup.id_grup_peserta,
          nama_grup: grup.nama_grup,
          jenis_grup: grup.jenis_grup,
          lokasi: grup.Lokasi ? {
            lokasi_id: grup.Lokasi.lokasi_id,
            ket: grup.Lokasi.ket
          } : null,
          nama_satker: namaSatker
        },
        statistik: {
          total_pegawai: totalPegawai,
          total_hadir: totalHadir,
          total_tidak_hadir: totalTidakHadir,
          persentase_kehadiran: persentase
        },
        pegawai: pegawaiWithKehadiran
      }
    });
  } catch (error) {
    console.error('Get Detail Grup Peserta Kegiatan Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Download Excel untuk grup peserta (khusus atau OPD)
const downloadGrupPesertaExcel = async (req, res) => {
  try {
    const { id_kegiatan, id_grup_peserta } = req.params;

    // Validasi parameter
    if (!id_kegiatan || !id_grup_peserta) {
      return res.status(400).json({
        success: false,
        error: 'ID kegiatan dan ID grup peserta harus disediakan'
      });
    }

    // Dapatkan data kegiatan
    const kegiatan = await MasterJadwalKegiatan.findByPk(id_kegiatan);
    if (!kegiatan) {
      return res.status(404).json({
        success: false,
        error: 'Kegiatan tidak ditemukan'
      });
    }

    // Dapatkan data grup
    const grup = await GrupPesertaKegiatan.findByPk(id_grup_peserta, {
      include: [
        {
          model: Lokasi,
          attributes: ['lokasi_id', 'ket']
        }
      ]
    });

    if (!grup) {
      return res.status(404).json({
        success: false,
        error: 'Grup peserta tidak ditemukan'
      });
    }

    // Ambil semua peserta dalam grup
    const pesertaList = await PesertaGrupKegiatan.findAll({
      where: { id_grup_peserta: parseInt(id_grup_peserta) },
      attributes: ['id', 'nip', 'created_at']
    });

    // Dapatkan data pegawai untuk setiap NIP
    const nipList = pesertaList.map(p => p.nip).filter(Boolean);
    const pegawaiList = await MstPegawai.findAll({
      where: {
        NIP: { [Op.in]: nipList },
        STATUSAKTIF: 'AKTIF'
      },
      attributes: ['NIP', 'NAMA', 'GLRDEPAN', 'GLRBELAKANG', 'KDSATKER']
    });

    // Dapatkan data kehadiran untuk kegiatan ini
    const kehadiranData = await KehadiranKegiatan.findAll({
      where: {
        id_kegiatan: parseInt(id_kegiatan),
        absen_nip: { [Op.in]: nipList }
      },
      attributes: ['absen_nip', 'absen_tgljam', 'absen_kat']
    });

    // Mapping kehadiran berdasarkan NIP
    const kehadiranMap = {};
    kehadiranData.forEach(k => {
      kehadiranMap[k.absen_nip] = {
        hadir: true,
        absen_tgljam: k.absen_tgljam,
        absen_kat: k.absen_kat
      };
    });

    // Mapping NIP ke data pegawai
    const pegawaiMap = {};
    pegawaiList.forEach(p => {
      pegawaiMap[p.NIP] = {
        nip: p.NIP,
        nama: p.NAMA,
        gelar_depan: p.GLRDEPAN || '',
        gelar_belakang: p.GLRBELAKANG || '',
        nama_lengkap: `${p.GLRDEPAN || ''} ${p.NAMA} ${p.GLRBELAKANG || ''}`.trim(),
        kdsatker: p.KDSATKER
      };
    });

    // Gabungkan data peserta dengan data pegawai dan kehadiran
    const pegawaiWithAttendance = pesertaList.map(p => {
      const pegawai = pegawaiMap[p.nip] || {
        nip: p.nip,
        nama: p.nip,
        nama_lengkap: p.nip,
        gelar_depan: '',
        gelar_belakang: '',
        kdsatker: null
      };
      const kehadiran = kehadiranMap[p.nip] || null;

      return {
        nip: pegawai.nip,
        nama: pegawai.nama,
        nama_lengkap: pegawai.nama_lengkap,
        hadir: kehadiran !== null,
        kehadiran_data: kehadiran
      };
    });

    // Hitung statistik
    const totalPegawai = pegawaiWithAttendance.length;
    const totalHadir = pegawaiWithAttendance.filter(p => p.hadir).length;
    const totalTidakHadir = totalPegawai - totalHadir;
    const persentaseKehadiran = totalPegawai > 0 ? Math.round((totalHadir / totalPegawai) * 100) : 0;

    // Dapatkan nama satker jika jenis grup OPD
    let namaSatker = null;
    if (grup.jenis_grup === 'opd' && grup.id_satker) {
      const satker = await SatkerTbl.findOne({
        where: { KDSATKER: grup.id_satker },
        attributes: ['NMSATKER']
      });
      namaSatker = satker ? satker.NMSATKER : null;
    }

    // Buat workbook Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Kehadiran Pegawai');

    // Tambahkan informasi laporan di atas
    const titleRow = worksheet.addRow(['', '', '', 'LAPORAN KEHADIRAN PEGAWAI']);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    worksheet.addRow(['', '', 'Nama Grup', `: ${grup.nama_grup}`]);
    if (namaSatker) {
      worksheet.addRow(['', '', 'Satuan Kerja', `: ${namaSatker}`]);
    }
    if (grup.Lokasi) {
      worksheet.addRow(['', '', 'Lokasi', `: ${grup.Lokasi.ket}`]);
    }
    worksheet.addRow(['', '', 'Tanggal Kegiatan', `: ${new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID')}`]);
    if (kegiatan.jam_mulai && kegiatan.jam_selesai) {
      worksheet.addRow(['', '', 'Waktu Kegiatan', `: ${kegiatan.jam_mulai.substring(0, 5)} - ${kegiatan.jam_selesai.substring(0, 5)}`]);
    }
    worksheet.addRow(['', '', 'Nama Kegiatan', `: ${kegiatan.keterangan || '-'}`]);
    worksheet.addRow(['', '', 'Jenis Kegiatan', `: ${kegiatan.jenis_kegiatan}`]);
    worksheet.addRow([]);

    const summaryTitleRow = worksheet.addRow(['', '', 'RINGKASAN KEHADIRAN']);
    summaryTitleRow.font = { bold: true, size: 14 };
    worksheet.addRow(['', '', 'Total Pegawai', `: ${totalPegawai}`]);
    worksheet.addRow(['', '', 'Total Hadir', `: ${totalHadir}`]);
    worksheet.addRow(['', '', 'Total Tidak Hadir', `: ${totalTidakHadir}`]);
    worksheet.addRow(['', '', 'Persentase Kehadiran', `: ${persentaseKehadiran}%`]);
    worksheet.addRow([]);

    // Set header tabel
    worksheet.addRow(['', 'No', 'NIP', 'Nama Lengkap', 'Status Kehadiran', 'Waktu Kehadiran']);

    // Style header tabel
    const headerRow = worksheet.lastRow;
    headerRow.font = { bold: true };
    for (let col = 2; col <= 6; col++) {
      const cell = headerRow.getCell(col);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }

    // Set column widths
    worksheet.getColumn(1).width = 3;   // Space/Empty column
    worksheet.getColumn(2).width = 5;   // No
    worksheet.getColumn(3).width = 20;  // NIP
    worksheet.getColumn(4).width = 50;  // Nama Lengkap
    worksheet.getColumn(5).width = 20;  // Status Kehadiran
    worksheet.getColumn(6).width = 20;  // Waktu Kehadiran

    // Tambahkan data
    pegawaiWithAttendance.forEach((pegawai, index) => {
      const waktuKehadiran = pegawai.kehadiran_data
        ? new Date(pegawai.kehadiran_data.absen_tgljam).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : '-';

      const dataRow = worksheet.addRow([
        '', // Space column
        index + 1,
        pegawai.nip,
        pegawai.nama_lengkap,
        pegawai.hadir ? 'Hadir' : 'Tidak Hadir',
        waktuKehadiran
      ]);

      // Beri warna pada kolom status kehadiran
      const fillColor = pegawai.hadir
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDFFFE0' } } // light green
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } }; // light red

      dataRow.getCell(5).fill = fillColor;

      // Tambahkan border pada setiap cell di row data
      for (let col = 2; col <= 6; col++) {
        const cell = dataRow.getCell(col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    });

    // Set filename
    const tanggalKegiatan = new Date(kegiatan.tanggal_kegiatan).toLocaleDateString('id-ID');
    const grupName = grup.nama_grup.replace(/\s+/g, '_');
    const filename = `Laporan_Kehadiran_${grupName}_${tanggalKegiatan.replace(/\//g, '-')}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download Grup Peserta Excel Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllGrupPeserta,
  getGrupPesertaById,
  createGrupPeserta,
  updateGrupPeserta,
  deleteGrupPeserta,
  getPesertaGrup,
  addPesertaToGrup,
  importPesertaFromExcel,
  removePesertaFromGrup,
  getAllGrupPesertaKegiatan,
  getDetailGrupPesertaKegiatan,
  downloadGrupPesertaExcel,
  upload // Export multer upload untuk digunakan di routes
};

