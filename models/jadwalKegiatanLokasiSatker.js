"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JadwalKegiatanLokasiSatker extends Model {
    static associate(models) {
      JadwalKegiatanLokasiSatker.belongsTo(models.MasterJadwalKegiatan, { foreignKey: "id_kegiatan" });
      JadwalKegiatanLokasiSatker.belongsTo(models.Lokasi, { foreignKey: "lokasi_id" });
      // Relasi ke User untuk peserta berbasis NIP
      JadwalKegiatanLokasiSatker.belongsTo(models.User, {
        foreignKey: 'nip',
        targetKey: 'username',
        as: 'pegawai'
      });
      
      // Relasi dengan GrupPesertaKegiatan
      JadwalKegiatanLokasiSatker.belongsTo(models.GrupPesertaKegiatan, {
        foreignKey: 'id_grup_peserta',
        as: 'grup_peserta',
        required: false
      });
      
      // Note: Tidak ada relasi langsung dengan SkpdTbl karena berbeda database
    }
  }
  
  JadwalKegiatanLokasiSatker.init(
    {
      id: {
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
      id_satker: {
        type: DataTypes.STRING(10),
        allowNull: false,
        comment: 'Kode SKPD yang diarahkan ke lokasi ini'
      },
      nip: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'NIP pegawai yang menjadi peserta kegiatan (opsional, jika entri berdasarkan individu)'
      },
      id_grup_peserta: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'grup_peserta_kegiatan',
          key: 'id_grup_peserta'
        },
        comment: 'ID grup peserta (jika peserta berasal dari grup)'
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
      modelName: "JadwalKegiatanLokasiSatker",
      tableName: "jadwal_kegiatan_lokasi_satker",
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );
  
  return JadwalKegiatanLokasiSatker;
}; 