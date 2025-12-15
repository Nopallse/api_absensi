const { SatkerTbl, MstPegawai } = require("../models");
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");

const exportSatkerEmployees = async () => {
  try {
    console.log("📊 Mulai mengambil data Satker dan Pegawai...");

    // Ambil semua Satker
    const satkerList = await SatkerTbl.findAll({
      attributes: ['KDSATKER', 'NMSATKER', 'KDSKPD'],
      order: [['KDSATKER', 'ASC']],
      raw: true
    });

    if (satkerList.length === 0) {
      console.warn("⚠️  Tidak ada data Satker ditemukan");
      return;
    }

    console.log(`✅ Ditemukan ${satkerList.length} Satker`);

    // Ambil data pegawai aktif per Satker dengan join
    const satkerWithEmployees = await Promise.all(
      satkerList.map(async (satker) => {
        // Hitung jumlah pegawai aktif berdasarkan kolom STATUSAKTIF (AKTIF/NONAKTIF)
        const activeEmployeeCount = await MstPegawai.count({
          where: {
            KDSATKER: satker.KDSATKER,
            STATUSAKTIF: 'AKTIF'
          }
        });

        // Hitung jumlah pegawai non-aktif (termasuk null agar aman)
        const nonActiveEmployeeCount = await MstPegawai.count({
          where: {
            KDSATKER: satker.KDSATKER,
            [Sequelize.Op.or]: [
              { STATUSAKTIF: 'NONAKTIF' },
              { STATUSAKTIF: null }
            ]
          }
        });

        // Hitung total pegawai
        const totalEmployeeCount = await MstPegawai.count({
          where: { KDSATKER: satker.KDSATKER }
        });

        return {
          kd_satker: satker.KDSATKER,
          nm_satker: satker.NMSATKER,
          kd_skpd: satker.KDSKPD,
          pegawai_aktif: activeEmployeeCount,
          pegawai_total: totalEmployeeCount,
          pegawai_nonaktif: nonActiveEmployeeCount
        };
      })
    );

    // Filter hanya Satker yang memiliki pegawai aktif
    const satkerWithActiveEmployees = satkerWithEmployees.filter(
      s => s.pegawai_aktif > 0
    );

    console.log(`✅ Ditemukan ${satkerWithActiveEmployees.length} Satker dengan pegawai aktif`);

    // Generate CSV
    const csvHeaders = [
      "Kode Satker",
      "Nama Satker",
      "Kode SKPD",
      "Pegawai Aktif",
      "Pegawai Total",
      "Pegawai Non-Aktif"
    ];

    const csvRows = satkerWithActiveEmployees.map(satker => [
      satker.kd_satker,
      `"${satker.nm_satker}"`, // Wrap dengan quote untuk handle koma dalam nama
      satker.kd_skpd,
      satker.pegawai_aktif,
      satker.pegawai_total,
      satker.pegawai_nonaktif
    ]);

    // Buat CSV content
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    // Tentukan path output
    const outputDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputFile = path.join(outputDir, `satker-employees-${timestamp}.csv`);

    // Tulis CSV ke file
    fs.writeFileSync(outputFile, csvContent, "utf-8");

    console.log(`\n✅ Export berhasil!`);
    console.log(`📁 File tersimpan di: ${outputFile}`);
    console.log(`📊 Total Satker dengan pegawai aktif: ${satkerWithActiveEmployees.length}`);
    console.log(`👥 Total pegawai aktif: ${satkerWithActiveEmployees.reduce((sum, s) => sum + s.pegawai_aktif, 0)}`);

    // Tampilkan preview
    console.log("\n📋 Preview data (10 baris pertama):");
    console.log("═".repeat(100));
    console.log(
      [
        csvHeaders.join(" | "),
        "─".repeat(100),
        ...csvRows.slice(0, 10).map(row => row.join(" | "))
      ].join("\n")
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

// Run script
exportSatkerEmployees();
