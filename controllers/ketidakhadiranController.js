const { Ketidakhadiran, User, Notifikasi } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const admin = require('../config/firebase-admin');

// Create new ketidakhadiran request
const createKetidakhadiran = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tdkhadir_mulai, tdkhadir_selesai, tdkhadir_kat, tdkhadir_ket } = req.body;
    const userNip = req.user.username;

    // Validate dates
    const startDate = new Date(tdkhadir_mulai);
    const endDate = new Date(tdkhadir_selesai);
    
    if (startDate > endDate) {
      return res.status(400).json({ error: "Tanggal selesai harus lebih besar dari tanggal mulai" });
    }

    // Check for overlapping requests
    const overlappingRequest = await Ketidakhadiran.findOne({
      where: {
        tdkhadir_nip: userNip,
        [Op.or]: [
          {
            tdkhadir_mulai: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            tdkhadir_selesai: {
              [Op.between]: [startDate, endDate]
            }
          }
        ]
      }
    });

    if (overlappingRequest) {
      return res.status(400).json({ error: "Sudah ada pengajuan ketidakhadiran pada rentang waktu tersebut" });
    }

    const ketidakhadiran = await Ketidakhadiran.create({
      tdkhadir_nip: userNip,
      tdkhadir_mulai: startDate,
      tdkhadir_selesai: endDate,
      tdkhadir_kat: tdkhadir_kat,
      tdkhadir_ket: tdkhadir_ket,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: ketidakhadiran
    });
  } catch (error) {
    console.error('Create Ketidakhadiran Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ketidakhadiran for current user
const getKetidakhadiran = async (req, res) => {
  try {
    const userNip = req.user.username;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: ketidakhadiran } = await Ketidakhadiran.findAndCountAll({
      where: {
        tdkhadir_nip: userNip
      },
      include: [{
        model: User,
        attributes: ['username', 'email']
      }],
      order: [['tdkhadir_mulai', 'DESC']],
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      data: ketidakhadiran,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get Ketidakhadiran Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all ketidakhadiran (admin only)
const getAllKetidakhadiran = async (req, res) => {
  try {

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;

    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause.tdkhadir_nip = {
        [Op.like]: `%${search}%`
      };
    }

    const { count, rows: ketidakhadiran } = await Ketidakhadiran.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        attributes: ['username', 'email']
      }],
      order: [['tdkhadir_mulai', 'DESC']],
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      data: ketidakhadiran,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('Get All Ketidakhadiran Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get detail ketidakhadiran
const getDetailKetidakhadiran = async (req, res) => {
  try {
    const { id } = req.params;

    const ketidakhadiran = await Ketidakhadiran.findOne({
      where: {
        tdkhadir_id: id,
      },
      include: [{
        model: User,
        attributes: ['username', 'email']
      }]
    });

    if (!ketidakhadiran) {
      return res.status(404).json({ error: 'Data ketidakhadiran tidak ditemukan' });
    }

    res.status(200).json({
      success: true,
      data: ketidakhadiran
    });
  } catch (error) {
    console.error('Get Detail Ketidakhadiran Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update ketidakhadiran status (admin only)
const updateKetidakhadiranStatus = async (req, res) => {
  try {

    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' });
    }

    if (status === 'rejected' && !rejection_reason) {
      return res.status(400).json({ error: 'Alasan penolakan harus diisi' });
    }

    const ketidakhadiran = await Ketidakhadiran.findOne({
      where: { tdkhadir_id: id },
      include: [{
        model: User,
        attributes: ['username', 'email', 'device_id','fcm_token']
      }]
    });

    if (!ketidakhadiran) {
      return res.status(404).json({ error: 'Data ketidakhadiran tidak ditemukan' });
    }

    // if (ketidakhadiran.status !== 'pending') {
    //   return res.status(400).json({ error: 'Status sudah diubah sebelumnya' });
    // }

    await ketidakhadiran.update({
      status,
      approved_by: "admin",
      approved_at: new Date(),
      rejection_reason: status === 'rejected' ? rejection_reason : null
    });

    // Create notification
    const notificationTitle = status === 'approved' ? 'Pengajuan Diterima' : 'Pengajuan Ditolak';
    const notificationBody = status === 'approved' 
      ? `Pengajuan ketidakhadiran Anda telah disetujui oleh admin`
      : `Pengajuan ketidakhadiran Anda ditolak oleh admin Alasan: ${rejection_reason}`;

    // Save notification to database
    await Notifikasi.create({
      user_id: ketidakhadiran.tdkhadir_nip,
      title: notificationTitle,
      body: notificationBody,
      type: 'ketidakhadiran_status',
      reference_id: id.toString(),
      is_read: false
    });

    // Send FCM notification if user has fcm_token
    if (ketidakhadiran.User && ketidakhadiran.User.fcm_token) {
      const rawToken = ketidakhadiran.User.fcm_token;

      const cleanToken = rawToken.trim(); // atau lebih aman:
      const finalToken = cleanToken.replace(/\s+/g, ''); // buang semua whitespace tersembunyi

      const message = {
        notification: {
          title: notificationTitle,
          body: notificationBody
        },
        data: {
          type: 'ketidakhadiran_status',
          id: id.toString(),
          status: status,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        token: finalToken
      };
      const hardcoded = "ebxGODlBQSyyYX1KlIrQ4j:APA91bFkjeEpFEHuGHfWtH5_8p4vdgoeieqHAG-xA-BnDN76GZnOIryLwUbKn7G9pygrjyDPo4nbiIG7xnGboChXPP9vXAhEB2_38r3-b5OmLJxHqDE88Hg";
      console.log(finalToken)
      console.log(hardcoded)
      console.log(finalToken === hardcoded,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"); 
      try {
        await admin.messaging().send(message);
      } catch (fcmError) {
        console.error('FCM Notification Error:', fcmError);
        // Don't return error to client if FCM fails
      }
    }

    res.status(200).json({
      success: true,
      data: ketidakhadiran
    });
  } catch (error) {
    console.error('Update Ketidakhadiran Status Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createKetidakhadiran,
  getKetidakhadiran,
  getAllKetidakhadiran,
  getDetailKetidakhadiran,
  updateKetidakhadiranStatus
}; 