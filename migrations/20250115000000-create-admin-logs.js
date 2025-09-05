'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      admin_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'ID admin yang melakukan aksi'
      },
      admin_username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Username admin yang melakukan aksi'
      },
      admin_level: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Level admin (1=superadmin, 2=admin_opd, 3=admin_upt)'
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Aksi yang dilakukan (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc)'
      },
      resource: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Resource yang diakses (users, kehadiran, lokasi, etc)'
      },
      resource_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ID resource yang diakses (jika ada)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi detail aksi yang dilakukan'
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address admin'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent browser/admin'
      },
      request_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Data request yang dikirim (untuk audit trail)'
      },
      response_status: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'HTTP status code response'
      },
      response_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Data response yang dikembalikan (untuk audit trail)'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Pesan error jika ada'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Durasi eksekusi dalam milidetik'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('admin_logs', ['admin_id']);
    await queryInterface.addIndex('admin_logs', ['action']);
    await queryInterface.addIndex('admin_logs', ['resource']);
    await queryInterface.addIndex('admin_logs', ['created_at']);
    await queryInterface.addIndex('admin_logs', ['admin_level']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admin_logs');
  }
};
