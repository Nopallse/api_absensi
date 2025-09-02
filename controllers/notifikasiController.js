const { Notifikasi } = require('../models');
const { Op } = require('sequelize');

const getNotifikasi = async (req, res) => {
  try {
    const userNip = req.user.username;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const isRead = req.query.is_read;

    const whereClause = {
      user_id: userNip
    };

    if (isRead !== undefined) {
      whereClause.is_read = isRead === 'true';
    }

    const { count, rows: notifikasi } = await Notifikasi.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      data: notifikasi,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get Notifikasi Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userNip = req.user.username;

    const notifikasi = await Notifikasi.findOne({
      where: {
        notif_id: id,
        user_id: userNip
      }
    });

    if (!notifikasi) {
      return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
    }

    await notifikasi.update({ is_read: true });

    res.status(200).json({
      success: true,
      data: notifikasi
    });
  } catch (error) {
    console.error('Mark Notifikasi as Read Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userNip = req.user.username;

    await Notifikasi.update(
      { is_read: true },
      {
        where: {
          user_id: userNip,
          is_read: false
        }
      }
    );

    res.status(200).json({
      success: true,
      message: 'Semua notifikasi telah ditandai sebagai telah dibaca'
    });
  } catch (error) {
    console.error('Mark All Notifikasi as Read Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread notification count
const getUnreadCount = async (req, res) => {
  try {
    const userNip = req.user.username;

    const count = await Notifikasi.count({
      where: {
        user_id: userNip,
        is_read: false
      }
    });

    res.status(200).json({
      success: true,
      data: { unread_count: count }
    });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getNotifikasi,
  markAsRead,
  markAllAsRead,
  getUnreadCount
}; 