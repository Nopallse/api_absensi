"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class KehadiranKegiatan extends Model {
    static associate(models) {
      // Relasi dengan user
      KehadiranKegiatan.belongsTo(models.User, { 
        foreignKey: 'absen_nip',
        targetKey: 'username'
      });
      
      // Relasi dengan lokasi
      KehadiranKegiatan.belongsTo(models.Lokasi, { 
        foreignKey: 'lokasi_id',
        targetKey: 'lokasi_id'
      });

      // Relasi dengan kegiatan
      KehadiranKegiatan.belongsTo(models.MasterJadwalKegiatan, { 
        foreignKey: 'id_kegiatan',
        targetKey: 'id_kegiatan',
        as: 'kegiatan'
      });
    }
  }

  KehadiranKegiatan.init(
    {
      absen_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "absen_id",
        allowNull: false,
      },
      absen_nip: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'NIP pegawai yang melakukan kehadiran'
      },
      lokasi_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'lokasi',
          key: 'lokasi_id'
        },
        comment: 'ID lokasi kegiatan'
      },
      id_kegiatan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'master_jadwal_kegiatan',
          key: 'id_kegiatan'
        },
        comment: 'ID kegiatan yang dihadiri'
      },
      absen_tgl: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal kehadiran'
      },
      absen_tgljam: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Tanggal dan jam kehadiran'
      },
      absen_kat: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'HADIR',
        validate: {
          isIn: [['HADIR']]
        },
        comment: 'Kategori kehadiran (untuk kegiatan hanya HADIR)'
      },
    },
    {
      sequelize,
      modelName: "KehadiranKegiatan",
      tableName: "kehadiran_kegiatan",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['absen_nip']
        },
        {
          fields: ['id_kegiatan']
        },
        {
          fields: ['absen_tgl']
        },
        {
          unique: true,
          fields: ['absen_nip', 'id_kegiatan', 'absen_tgl'],
          name: 'unique_kehadiran_kegiatan_per_day'
        }
      ]
    }
  );

  return KehadiranKegiatan;
};
