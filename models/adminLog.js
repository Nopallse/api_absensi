'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AdminLog extends Model {
    static associate(models) {
      // AdminLog belongs to User (admin yang melakukan aksi)
      AdminLog.belongsTo(models.User, {
        foreignKey: 'admin_id',
        targetKey: 'id',
        as: 'admin'
      });
    }
  }

  AdminLog.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID admin yang melakukan aksi'
    },
    admin_username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Username admin yang melakukan aksi'
    },
    admin_level: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'Level admin (1=superadmin, 2=admin_opd, 3=admin_upt)'
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Aksi yang dilakukan (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc)'
    },
    resource: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Resource yang diakses (users, kehadiran, lokasi, etc)'
    },
    resource_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID resource yang diakses (jika ada)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Deskripsi detail aksi yang dilakukan'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address admin'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent browser/admin'
    },
    request_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Data request yang dikirim (untuk audit trail)',
      get() {
        const value = this.getDataValue('request_data');
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      },
      set(value) {
        if (value && typeof value === 'object') {
          this.setDataValue('request_data', JSON.stringify(value));
        } else {
          this.setDataValue('request_data', value);
        }
      }
    },
    response_status: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP status code response'
    },
    response_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Data response yang dikembalikan (untuk audit trail)',
      get() {
        const value = this.getDataValue('response_data');
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      },
      set(value) {
        if (value && typeof value === 'object') {
          this.setDataValue('response_data', JSON.stringify(value));
        } else {
          this.setDataValue('response_data', value);
        }
      }
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Pesan error jika ada'
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Durasi eksekusi dalam milidetik'
    }
  }, {
    sequelize,
    modelName: 'AdminLog',
    tableName: 'admin_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['admin_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['resource']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['admin_level']
      }
    ]
  });

  return AdminLog;
};
