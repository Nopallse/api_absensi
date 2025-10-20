"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Relasi ke tabel kehadiran
      User.hasMany(models.Kehadiran, { 
        foreignKey: 'absen_nip',
        sourceKey: 'username'
      });

      // Relasi ke tabel adm_opd
      User.hasOne(models.AdmOpd, {
        foreignKey: 'id_user',
        sourceKey: 'id'
      });

      // Relasi ke tabel adm_upt
      User.hasOne(models.AdmUpt, {
        foreignKey: 'id_user',
        sourceKey: 'id'
      });

      // Relasi ke device reset requests (sebagai user yang request)
      User.hasMany(models.DeviceResetRequest, {
        foreignKey: 'user_id',
        as: 'deviceResetRequests'
      });

      // Relasi ke device reset requests (sebagai admin yang approve)
      User.hasMany(models.DeviceResetRequest, {
        foreignKey: 'approved_by',
        as: 'approvedResetRequests'
      });
    }
  }

  User.init(
    {
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      level: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      fcm_token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "user",
      underscored: true, 
      timestamps: true, 
    }
  );

  return User;
};
