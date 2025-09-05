const { AdminLog, User } = require('../models/index');
const { Op } = require('sequelize');

/**
 * Get all admin logs with pagination and filtering
 */
const getAllAdminLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      admin_id,
      action,
      resource,
      start_date,
      end_date,
      admin_level,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    const whereCondition = {};

    // Filter by admin ID
    if (admin_id) {
      whereCondition.admin_id = admin_id;
    }

    // Filter by action
    if (action) {
      whereCondition.action = action;
    }

    // Filter by resource
    if (resource) {
      whereCondition.resource = resource;
    }

    // Filter by admin level
    if (admin_level) {
      whereCondition.admin_level = admin_level;
    }

    // Filter by date range
    if (start_date || end_date) {
      whereCondition.created_at = {};
      if (start_date) {
        whereCondition.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereCondition.created_at[Op.lte] = new Date(end_date);
      }
    }

    // Search in description
    if (search) {
      whereCondition.description = {
        [Op.like]: `%${search}%`
      };
    }

    const { count, rows: logs } = await AdminLog.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'level', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting admin logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get admin logs',
      message: error.message 
    });
  }
};

/**
 * Get admin log by ID
 */
const getAdminLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AdminLog.findByPk(id, {
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'level', 'status']
        }
      ]
    });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Admin log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });

  } catch (error) {
    console.error('Error getting admin log by ID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get admin log',
      message: error.message 
    });
  }
};

/**
 * Get admin logs by admin ID
 */
const getAdminLogsByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: logs } = await AdminLog.findAndCountAll({
      where: { admin_id: adminId },
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'username', 'email', 'level', 'status']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error getting admin logs by admin ID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get admin logs',
      message: error.message 
    });
  }
};

/**
 * Get admin activity statistics
 */
const getAdminLogStats = async (req, res) => {
  try {
    const { start_date, end_date, admin_id } = req.query;

    const whereCondition = {};
    if (admin_id) {
      whereCondition.admin_id = admin_id;
    }
    if (start_date || end_date) {
      whereCondition.created_at = {};
      if (start_date) {
        whereCondition.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        whereCondition.created_at[Op.lte] = new Date(end_date);
      }
    }

    // Get total logs
    const totalLogs = await AdminLog.count({ where: whereCondition });

    // Get logs by action
    const logsByAction = await AdminLog.findAll({
      attributes: [
        'action',
        [AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'count']
      ],
      where: whereCondition,
      group: ['action'],
      order: [[AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'DESC']]
    });

    // Get logs by resource
    const logsByResource = await AdminLog.findAll({
      attributes: [
        'resource',
        [AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'count']
      ],
      where: whereCondition,
      group: ['resource'],
      order: [[AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'DESC']]
    });

    // Get logs by admin level
    const logsByLevel = await AdminLog.findAll({
      attributes: [
        'admin_level',
        [AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'count']
      ],
      where: whereCondition,
      group: ['admin_level'],
      order: [[AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'DESC']]
    });

    // Get most active admins
    const mostActiveAdmins = await AdminLog.findAll({
      attributes: [
        'admin_id',
        'admin_username',
        'admin_level',
        [AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'count']
      ],
      where: whereCondition,
      group: ['admin_id', 'admin_username', 'admin_level'],
      order: [[AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'DESC']],
      limit: 10
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await AdminLog.findAll({
      attributes: [
        [AdminLog.sequelize.fn('DATE', AdminLog.sequelize.col('created_at')), 'date'],
        [AdminLog.sequelize.fn('COUNT', AdminLog.sequelize.col('id')), 'count']
      ],
      where: {
        ...whereCondition,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      },
      group: [AdminLog.sequelize.fn('DATE', AdminLog.sequelize.col('created_at'))],
      order: [[AdminLog.sequelize.fn('DATE', AdminLog.sequelize.col('created_at')), 'ASC']]
    });

    res.json({
      success: true,
      data: {
        totalLogs,
        logsByAction,
        logsByResource,
        logsByLevel,
        mostActiveAdmins,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error getting admin log stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get admin log statistics',
      message: error.message 
    });
  }
};

/**
 * Delete old admin logs (cleanup)
 */
const deleteOldAdminLogs = async (req, res) => {
  try {
    const { days = 90 } = req.body; // Default delete logs older than 90 days

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedCount = await AdminLog.destroy({
      where: {
        created_at: {
          [Op.lt]: cutoffDate
        }
      }
    });

    res.json({
      success: true,
      message: `Deleted ${deletedCount} admin logs older than ${days} days`,
      deletedCount
    });

  } catch (error) {
    console.error('Error deleting old admin logs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete old admin logs',
      message: error.message 
    });
  }
};

module.exports = {
  getAllAdminLogs,
  getAdminLogById,
  getAdminLogsByAdminId,
  getAdminLogStats,
  deleteOldAdminLogs
};
