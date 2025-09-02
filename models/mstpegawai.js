"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class MstPegawai extends Model {
    static associate(models) {
      // Relasi dengan skpd_tbl
      MstPegawai.belongsTo(models.SkpdTbl, {
        foreignKey: 'KDSKPD',
        targetKey: 'KDSKPD'
      });
    }
  }

  MstPegawai.init(
    {
      NIP: {
        type: DataTypes.STRING(18),
        primaryKey: true,
        allowNull: false,
        field: 'NIP'
      },
      NAMA: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'NAMA'
      },
      GLRDEPAN: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: '',
        field: 'GLRDEPAN'
      },
      GLRBELAKANG: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: '',
        field: 'GLRBELAKANG'
      },
      KDJENKEL: {
        type: DataTypes.SMALLINT(1),
        allowNull: true,
        defaultValue: 1,
        field: 'KDJENKEL'
      },
      TEMPATLHR: {
        type: DataTypes.STRING(40),
        allowNull: true,
        field: 'TEMPATLHR'
      },
      KDKAB: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'KDKAB'
      },
      TGLLHR: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TGLLHR'
      },
      AGAMA: {
        type: DataTypes.SMALLINT(2),
        allowNull: true,
        field: 'AGAMA'
      },
      KDDIDIK: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'KDDIDIK'
      },
      TMTCAPEG: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTCAPEG'
      },
      TMTPNS: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTPNS'
      },
      KDSTAWIN: {
        type: DataTypes.SMALLINT(2),
        allowNull: true,
        defaultValue: 1,
        comment: '0 LAJANG,1 KAWIN,2 CERAI,3 JD/DD',
        field: 'KDSTAWIN'
      },
      KDSTAPEG: {
        type: DataTypes.SMALLINT(2),
        allowNull: true,
        field: 'KDSTAPEG'
      },
      TMTSTOP: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTSTOP'
      },
      KDPANGKAT: {
        type: DataTypes.STRING(2),
        allowNull: true,
        field: 'KDPANGKAT'
      },
      KDESELON: {
        type: DataTypes.STRING(2),
        allowNull: true,
        field: 'KDESELON'
      },
      KDSTRUKTURAL: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KDSTRUKTURAL'
      },
      TMTJABATANS: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTJABATANS'
      },
      KDFUNGSI: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KDFUNGSI'
      },
      TMTJABATAN: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTJABATAN'
      },
      KDFUNGSIUMUM: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KDFUNGSIUMUM'
      },
      TMTJABATANFU: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTJABATANFU'
      },
      KDGURU: {
        type: DataTypes.STRING(3),
        allowNull: true,
        field: 'KDGURU'
      },
      KDSSBP: {
        type: DataTypes.STRING(3),
        allowNull: true,
        field: 'KDSSBP'
      },
      KDSKPD: {
        type: DataTypes.STRING(3),
        allowNull: true,
        field: 'KDSKPD'
      },
      KDSATKER: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'KDSATKER'
      },
      BIDANGF: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'BIDANGF'
      },
      SUBF: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'SUBF'
      },
      ALAMAT: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'ALAMAT'
      },
      NOTELP: {
        type: DataTypes.STRING(40),
        allowNull: true,
        field: 'NOTELP'
      },
      NOKTP: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: 'NOKTP'
      },
      NPWP: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'NPWP'
      },
      NIPLAMA: {
        type: DataTypes.STRING(9),
        allowNull: true,
        field: 'NIPLAMA'
      },
      CATATAN: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '',
        field: 'CATATAN'
      },
      NOKARPEG: {
        type: DataTypes.STRING(30),
        allowNull: true,
        defaultValue: ' ',
        field: 'NOKARPEG'
      },
      KARISKARSU: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KARISKARSU'
      },
      STATUSAKTIF: {
        type: DataTypes.STRING(25),
        allowNull: true,
        field: 'STATUSAKTIF'
      },
      NAMAIBU: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NAMAIBU'
      },
      STATUS: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'STATUS'
      },
      PASSWORD: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'PASSWORD'
      },
      FOTO: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'FOTO'
      },
      LEMARI: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'LEMARI'
      },
      PLT: {
        type: DataTypes.ENUM('0', '1'),
        allowNull: true,
        defaultValue: '0',
        comment: '0 = tidak plt, 1 = plt/pelaksana',
        field: 'PLT'
      },
      TINGKAT_PENDIDIKAN: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'TINGKAT_PENDIDIKAN'
      },
      JURUSAN_PENDIDIKAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: '-',
        field: 'JURUSAN_PENDIDIKAN'
      },
      JENIS_PEGAWAI: {
        type: DataTypes.ENUM('PNS', 'P3K', 'NON PNS'),
        allowNull: true,
        defaultValue: 'PNS',
        field: 'JENIS_PEGAWAI'
      },
      KODE_JABATAN_TAMBAHAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KODE_JABATAN_TAMBAHAN'
      },
      KODE_UNOR_JABATAN_TAMBAHAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'KODE_UNOR_JABATAN_TAMBAHAN'
      },
      NM_UNOR_JABATAN_TAMBAHAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NM_UNOR_JABATAN_TAMBAHAN'
      },
      TMT_JABATAN_TAMBAHAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'TMT_JABATAN_TAMBAHAN'
      },
      PLT_JABATAN_TAMBAHAN: {
        type: DataTypes.TINYINT(4),
        allowNull: true,
        defaultValue: 0,
        comment: '0 = tidak plt, 1 = plt/pelaksana',
        field: 'PLT_JABATAN_TAMBAHAN'
      },
      EMAIL_GOV: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'EMAIL_GOV'
      },
      EMAIL: {
        type: DataTypes.STRING(150),
        allowNull: true,
        field: 'EMAIL'
      },
      BPJS: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'BPJS'
      },
      PNS_ID: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'PNS_ID ini berasal dari database BKN',
        field: 'PNS_ID'
      },
      LAST_ONLINE: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'LAST_ONLINE'
      },
      KODE_JABATAN: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Kode jabatan dari tabel jabatan. merupakan jabatan asn sekarang',
        field: 'KODE_JABATAN'
      },
      JENIS_JABATAN: {
        type: DataTypes.ENUM('Fungsional Umum', 'Fungsional Tertentu', 'Struktural'),
        allowNull: true,
        comment: 'Jenis jabatan',
        field: 'JENIS_JABATAN'
      },
      TMT_JABATAN: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'tmt jabatan utama',
        field: 'TMT_JABATAN'
      },
      JENIS_BERHENTI: {
        type: DataTypes.ENUM('Pensiun', 'Pindah'),
        allowNull: true,
        field: 'JENIS_BERHENTI'
      },
      TMT_BERHENTI: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'DIambil dari tabel pensiun dan mutasi keluar',
        field: 'TMT_BERHENTI'
      },
      KODE_UNIT_KERJA: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'KODE_UNIT_KERJA'
      },
      KODE_UNIT_KERJA_SIASN: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'KODE_UNIT_KERJA_SIASN'
      },
      NM_UNIT_KERJA: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NM_UNIT_KERJA'
      },
      JENIS_STOP: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'JENIS_STOP'
      },
      TOKEN_SIASN: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'TOKEN_SIASN'
      },
      GOL_AWAL: {
        type: DataTypes.STRING(5),
        allowNull: true,
        field: 'GOL_AWAL'
      },
      STATUSAKTIFKEPEGAWAIAN: {
        type: DataTypes.TINYINT(4),
        allowNull: false,
        defaultValue: 0,
        comment: 'Otomatis berdasarkan TMTBERHENTI',
        field: 'STATUSAKTIFKEPEGAWAIAN'
      },
      TMTGOL: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'TMTGOL'
      },
      MK_GOL_TAHUN: {
        type: DataTypes.SMALLINT(2),
        allowNull: false,
        defaultValue: 0,
        field: 'MK_GOL_TAHUN'
      },
      MK_GOL_BULAN: {
        type: DataTypes.SMALLINT(2),
        allowNull: false,
        defaultValue: 0,
        field: 'MK_GOL_BULAN'
      }
    },
    {
      sequelize,
      modelName: "MstPegawai",
      tableName: "mstpegawai",
      timestamps: false,
    }
  );

  return MstPegawai;
}; 