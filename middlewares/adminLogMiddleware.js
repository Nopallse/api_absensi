const { logAdminAction, logAdminError, getClientIP, getUserAgent, sanitizeData } = require('../utils/adminLogger');

/**
 * Middleware untuk logging admin actions
 * @param {Object} options - Konfigurasi logging
 * @param {string} options.action - Aksi yang dilakukan (CREATE, READ, UPDATE, DELETE, etc)
 * @param {string} options.resource - Resource yang diakses (users, kehadiran, lokasi, etc)
 * @param {Function} options.getResourceId - Function untuk mendapatkan resource ID dari request/response
 * @param {Function} options.getDescription - Function untuk mendapatkan deskripsi custom
 * @param {boolean} options.logRequest - Apakah log request data (default: true)
 * @param {boolean} options.logResponse - Apakah log response data (default: false)
 * @returns {Function} Express middleware function
 */
const adminLogMiddleware = (options = {}) => {
  const {
    action,
    resource,
    getResourceId = null,
    getDescription = null,
    logRequest = true,
    logResponse = false
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;
    let responseData = null;

    // Capture response data jika diperlukan
    if (logResponse) {
      res.send = function(data) {
        responseData = data;
        originalSend.call(this, data);
      };
    }

    // Override res.json untuk capture response
    const originalJson = res.json;
    res.json = function(data) {
      if (logResponse) {
        responseData = data;
      }
      originalJson.call(this, data);
    };

    try {
      // Lanjutkan ke controller
      await next();

      // Log setelah controller selesai (hanya jika tidak ada error)
      if (res.statusCode < 400) {
        const duration = Date.now() - startTime;
        
        // Get admin info dari req.user (dari JWT middleware)
        const adminInfo = req.user || {};
        
        // Get resource ID jika ada
        let resourceId = null;
        if (getResourceId) {
          resourceId = getResourceId(req, res);
        } else if (req.params.id) {
          resourceId = parseInt(req.params.id);
        } else if (req.params.lokasi_id) {
          resourceId = parseInt(req.params.lokasi_id);
        } else if (req.params.kdskpd) {
          resourceId = req.params.kdskpd;
        }

        // Get description
        let description = `${action} ${resource}`;
        if (getDescription) {
          description = getDescription(req, res);
        } else if (resourceId) {
          description = `${action} ${resource} with ID ${resourceId}`;
        }

        // Log admin action
        await logAdminAction({
          admin_id: adminInfo.id,
          admin_username: adminInfo.username,
          admin_level: adminInfo.level,
          action: action,
          resource: resource,
          resource_id: resourceId,
          description: description,
          ip_address: getClientIP(req),
          user_agent: getUserAgent(req),
          request_data: logRequest ? sanitizeData(req.body) : null,
          response_status: res.statusCode,
          response_data: logResponse ? sanitizeData(responseData) : null,
          duration_ms: duration
        });
      }

    } catch (error) {
      // Log error
      const duration = Date.now() - startTime;
      const adminInfo = req.user || {};
      
      await logAdminError({
        admin_id: adminInfo.id,
        admin_username: adminInfo.username,
        admin_level: adminInfo.level,
        action: action,
        resource: resource,
        error: error,
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        duration_ms: duration
      });

      // Re-throw error agar error handler bisa handle
      throw error;
    }
  };
};

/**
 * Middleware untuk logging login/logout actions
 * @param {string} action - LOGIN atau LOGOUT
 * @returns {Function} Express middleware function
 */
const adminAuthLogMiddleware = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      // Log setelah response dikirim
      setTimeout(async () => {
        try {
          const duration = Date.now() - startTime;
          const adminInfo = req.user || {};
          
          // Parse response data untuk mendapatkan user info
          let responseData = null;
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = data;
          }

          await logAdminAction({
            admin_id: adminInfo.id || responseData?.user?.id,
            admin_username: adminInfo.username || responseData?.user?.username,
            admin_level: adminInfo.level || responseData?.user?.level,
            action: action,
            resource: 'authentication',
            description: `${action} ${adminInfo.username || responseData?.user?.username}`,
            ip_address: getClientIP(req),
            user_agent: getUserAgent(req),
            request_data: sanitizeData(req.body),
            response_status: res.statusCode,
            response_data: sanitizeData(responseData),
            duration_ms: duration
          });
        } catch (logError) {
          console.error('Failed to log auth action:', logError);
        }
      }, 0);

      originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware untuk logging device reset actions
 * @param {string} action - Device reset action
 * @returns {Function} Express middleware function
 */
const adminDeviceResetLogMiddleware = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      setTimeout(async () => {
        try {
          const duration = Date.now() - startTime;
          const adminInfo = req.user || {};
          
          let responseData = null;
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = data;
          }

          await logAdminAction({
            admin_id: adminInfo.id,
            admin_username: adminInfo.username,
            admin_level: adminInfo.level,
            action: action,
            resource: 'device_reset',
            resource_id: req.params.id || responseData?.data?.id,
            description: `${action} device reset request`,
            ip_address: getClientIP(req),
            user_agent: getUserAgent(req),
            request_data: sanitizeData(req.body),
            response_status: res.statusCode,
            response_data: sanitizeData(responseData),
            duration_ms: duration
          });
        } catch (logError) {
          console.error('Failed to log device reset action:', logError);
        }
      }, 0);

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  adminLogMiddleware,
  adminAuthLogMiddleware,
  adminDeviceResetLogMiddleware
};
