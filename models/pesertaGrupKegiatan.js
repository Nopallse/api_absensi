"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PesertaGrupKegiatan extends Model {
    static associate(models) {
      // Relasi dengan GrupPesertaKegiatan
      PesertaGrupKegiatan.belongsTo(models.GrupPesertaKegiatan, { 
        foreignKey: "id_grup_peserta",
        as: 'grup'
      });
      
      // Relasi dengan User untuk mendapatkan data pegawai
      PesertaGrupKegiatan.belongsTo(models.User, {
        foreignKey: 'nip',
        targetKey: 'username',
        as: 'pegawai',
        constraints: false, // Tidak buat foreign key constraint di database
        required: false
      });
    }
  }
  
  PesertaGrupKegiatan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      id_grup_peserta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'grup_peserta_kegiatan',
          key: 'id_grup_peserta'
        }
      },
      nip: {
        type: DataTypes.STRING(30),
        allowNull: false,
        comment: 'NIP pegawai yang menjadi peserta dalam grup',
        references: null // Hapus foreign key constraint, hanya relasi logis via association
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
      },
      NM_UNIT_KERJA: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'NM_UNIT_KERJA',
        comment: 'Nama unit kerja peserta saat ditambahkan (data historis)'
      },
      KDSATKER: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'KDSATKER',
        comment: 'Kode satker peserta saat ditambahkan (data historis)'
      },
      BIDANGF: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'BIDANGF',
        comment: 'Kode bidang peserta saat ditambahkan (data historis)'
      },
      SUBF: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'SUBF',
        comment: 'Kode sub bidang peserta saat ditambahkan (data historis)'
      },
      nama_jabatan: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'nama_jabatan',
        comment: 'Nama jabatan peserta saat ditambahkan (data historis)'
      }
    },
    {
      sequelize,
      modelName: "PesertaGrupKegiatan",
      tableName: "peserta_grup_kegiatan",
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  );
  
  return PesertaGrupKegiatan;
};

