"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class GrupPesertaKegiatan extends Model {
    static associate(models) {
      // Relasi dengan MasterJadwalKegiatan
      GrupPesertaKegiatan.belongsTo(models.MasterJadwalKegiatan, { 
        foreignKey: "id_kegiatan" 
      });
      
      // Relasi dengan Lokasi
      GrupPesertaKegiatan.belongsTo(models.Lokasi, { 
        foreignKey: "lokasi_id" 
      });
      
      // Relasi dengan PesertaGrupKegiatan (hasMany)
      GrupPesertaKegiatan.hasMany(models.PesertaGrupKegiatan, { 
        foreignKey: "id_grup_peserta",
        as: 'peserta'
      });
      
      // Relasi dengan JadwalKegiatanLokasiSatker (hasMany)
      GrupPesertaKegiatan.hasMany(models.JadwalKegiatanLokasiSatker, { 
        foreignKey: "id_grup_peserta",
        as: 'relasi_lokasi_satker'
      });
    }
  }
  
  GrupPesertaKegiatan.init(
    {
      id_grup_peserta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_kegiatan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'master_jadwal_kegiatan',
          key: 'id_kegiatan'
        }
      },
      lokasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        }
      },
      nama_grup: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nama grup peserta (contoh: OPD Dinas Pendidikan, Pejabat Eselon 2)'
      },
      jenis_grup: {
        type: DataTypes.ENUM('opd', 'khusus'),
        allowNull: false,
        defaultValue: 'khusus',
        comment: 'Jenis grup: opd = berdasarkan OPD, khusus = grup khusus'
      },
      id_satker: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Kode SKPD (hanya terisi jika jenis_grup = opd)'
      },
      keterangan: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Keterangan tambahan untuk grup'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "GrupPesertaKegiatan",
      tableName: "grup_peserta_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );
  
  return GrupPesertaKegiatan;
};

