const express = require('express');
const router = express.Router();
const { getCacheStats, clearAllCaches } = require('../utils/cacheUtils');
const { DinasSetjam, JamDinas, JamDinasDetail, SystemSetting } = require('../models');

// Endpoint untuk monitoring performa
router.get('/stats', (req, res) => {
  try {
    const stats = getCacheStats();
    const memoryUsage = process.memoryUsage();
    
    res.json({
      success: true,
      data: {
        cache: stats,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(process.uptime()) + ' seconds',
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance stats',
      message: error.message
    });
  }
});

// Endpoint untuk clear cache
router.post('/clear-cache', (req, res) => {
  try {
    clearAllCaches();
    res.json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
});

// Endpoint untuk load testing
router.post('/load-test', async (req, res) => {
  try {
    const { concurrent, duration } = req.body;
    const concurrentUsers = concurrent || 100;
    const testDuration = duration || 30; // seconds
    
    res.json({
      success: true,
      message: `Load test started: ${concurrentUsers} concurrent users for ${testDuration} seconds`,
      testConfig: {
        concurrentUsers,
        testDuration,
        estimatedRequests: concurrentUsers * testDuration * 2 // Assuming 2 requests per second per user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start load test',
      message: error.message
    });
  }
});

// Endpoint untuk debug jam dinas
router.get('/debug/jam-dinas/:kdsatker', async (req, res) => {
  try {
    const { kdsatker } = req.params;
    
    // Get active tipe
    const tipeSetting = await SystemSetting.findOne({
      where: { key: 'active_tipe_jadwal' }
    });
    const activeTipe = tipeSetting ? tipeSetting.value : 'normal';
    
    // Get all DinasSetjam for this satker
    const dinasSetjamList = await DinasSetjam.findAll({
      where: {
        id_satker: kdsatker
      },
      include: [
        {
          model: JamDinas,
          as: 'jamDinas',
          include: [
            {
              model: JamDinasDetail,
              as: 'details'
            }
          ]
        }
      ]
    });
    
    // Get current day
    const currentDay = new Date().toLocaleDateString('id-ID', { weekday: 'long' }).toLowerCase();
    
    res.json({
      success: true,
      data: {
        kdsatker,
        activeTipe,
        currentDay,
        dinasSetjamCount: dinasSetjamList.length,
        dinasSetjamList: dinasSetjamList.map(ds => ({
          id: ds.dinset_id,
          id_satker: ds.id_satker,
          id_bidang: ds.id_bidang,
          jamDinas: ds.jamDinas ? {
            id: ds.jamDinas.id,
            nama: ds.jamDinas.nama,
            details: ds.jamDinas.details.map(d => ({
              id: d.id,
              hari: d.hari,
              tipe: d.tipe,
              jam_masuk_mulai: d.jam_masuk_mulai,
              jam_masuk_selesai: d.jam_masuk_selesai,
              jam_pulang_mulai: d.jam_pulang_mulai,
              jam_pulang_selesai: d.jam_pulang_selesai
            }))
          } : null
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get jam dinas debug info',
      message: error.message
    });
  }
});

module.exports = router;
