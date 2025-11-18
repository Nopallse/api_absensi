/**
 * Middleware untuk logging request dari client
 * Mencatat: method, path, IP, timestamp, status code, dan response time
 */

const requestLogMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Dapatkan IP address client (mendukung proxy)
  const clientIp = req.ip || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  // Log request saat masuk
  const requestInfo = {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: clientIp,
    timestamp: timestamp,
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  console.log(`[${timestamp}] ${requestInfo.method} ${requestInfo.path} - IP: ${clientIp}`);
  
  // Intercept response untuk log status code dan response time
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    const logData = {
      ...requestInfo,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    };
    
    // Log dengan format yang lebih informatif
    const statusColor = res.statusCode >= 500 ? '🔴' : 
                       res.statusCode >= 400 ? '🟡' : 
                       res.statusCode >= 300 ? '🔵' : '🟢';
    
    console.log(`${statusColor} [${new Date().toISOString()}] ${logData.method} ${logData.path} - Status: ${logData.statusCode} - Time: ${logData.responseTime} - IP: ${logData.ip}`);
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = requestLogMiddleware;

