module.exports = (sequelize, DataTypes) => {
const DeviceResetRequest = sequelize.define('DeviceResetRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Alasan user meminta reset device'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  admin_response: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Response dari admin OPD'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID admin OPD yang approve/reject'
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'device_reset_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Define associations
DeviceResetRequest.associate = (models) => {
  // User yang request reset device
  DeviceResetRequest.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // Admin yang approve/reject
  DeviceResetRequest.belongsTo(models.User, {
    foreignKey: 'approved_by',
    as: 'admin'
  });
};

return DeviceResetRequest;
};
