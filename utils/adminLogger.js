const { AdminLog } = require('../models/index');

/**
 * Log admin action ke database
 * @param {Object} logData - Data log admin
 * @param {number} logData.admin_id - ID admin
 * @param {string} logData.admin_username - Username admin
 * @param {string} logData.admin_level - Level admin
 * @param {string} logData.action - Aksi yang dilakukan
 * @param {string} logData.resource - Resource yang diakses
 * @param {number} logData.resource_id - ID resource (optional)
 * @param {string} logData.description - Deskripsi aksi
 * @param {string} logData.ip_address - IP address
 * @param {string} logData.user_agent - User agent
 * @param {Object} logData.request_data - Data request
 * @param {number} logData.response_status - HTTP status code
 * @param {Object} logData.response_data - Data response
 * @param {string} logData.error_message - Pesan error (optional)
 * @param {number} logData.duration_ms - Durasi eksekusi
 */
const logAdminAction = async (logData) => {
  try {
    // Simpan ke database
    await AdminLog.create({
      admin_id: logData.admin_id,
      admin_username: logData.admin_username,
      admin_level: logData.admin_level,
      action: logData.action,
      resource: logData.resource,
      resource_id: logData.resource_id || null,
      description: logData.description,
      ip_address: logData.ip_address,
      user_agent: logData.user_agent,
      request_data: logData.request_data || null,
      response_status: logData.response_status,
      response_data: logData.response_data || null,
      error_message: logData.error_message || null,
      duration_ms: logData.duration_ms
    });

  } catch (error) {
    // Log error ke console jika gagal simpan ke database
    console.error('Failed to log admin action to database:', error.message);
  }
};

/**
 * Log admin error ke database
 * @param {Object} errorData - Data error
 * @param {number} errorData.admin_id - ID admin
 * @param {string} errorData.admin_username - Username admin
 * @param {string} errorData.action - Aksi yang gagal
 * @param {string} errorData.resource - Resource yang diakses
 * @param {Error} errorData.error - Error object
 * @param {string} errorData.ip_address - IP address
 * @param {string} errorData.user_agent - User agent
 */
const logAdminError = async (errorData) => {
  try {
    await AdminLog.create({
      admin_id: errorData.admin_id,
      admin_username: errorData.admin_username,
      admin_level: errorData.admin_level || 'unknown',
      action: errorData.action,
      resource: errorData.resource,
      description: `Error: ${errorData.error.message}`,
      ip_address: errorData.ip_address,
      user_agent: errorData.user_agent,
      response_status: 500,
      error_message: errorData.error.message,
      duration_ms: errorData.duration_ms || 0
    });

  } catch (logError) {
    console.error('Failed to log admin error to database:', logError.message);
  }
};

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
};

/**
 * Get user agent from request
 * @param {Object} req - Express request object
 * @returns {string} User agent
 */
const getUserAgent = (req) => {
  return req.get('User-Agent') || 'unknown';
};

/**
 * Sanitize sensitive data from request/response
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'password_hash', 'auth_key', 'refresh_token', 'accessToken', 'refreshToken'];
  const sanitized = { ...data };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

module.exports = {
  logAdminAction,
  logAdminError,
  getClientIP,
  getUserAgent,
  sanitizeData
};
