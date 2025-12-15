const { verifyHMAC } = require('../utils/hmacUtils');
const { cache } = require('../utils/cacheUtils');

const TIMESTAMP_VALID_WINDOW = 5 * 60;
const NONCE_CACHE_TTL = 6 * 60;

const validateHMAC = () => {
  return (req, res, next) => {
    try {
      const hmacSignature = req.headers['x-hmac-signature'] || req.headers['hmac-signature'];
      const timestamp = req.headers['x-timestamp'] || req.body?.timestamp;
      const nonce = req.headers['x-nonce'] || req.body?.nonce;
      
      if (!hmacSignature) {
        return res.status(401).json({
          success: false,
          error: 'HMAC signature diperlukan',
          code: 'HMAC_SIGNATURE_REQUIRED'
        });
      }

      if (!timestamp) {
        return res.status(401).json({
          success: false,
          error: 'Timestamp diperlukan untuk keamanan',
          code: 'TIMESTAMP_REQUIRED'
        });
      }

      if (!nonce) {
        return res.status(401).json({
          success: false,
          error: 'Nonce diperlukan untuk mencegah replay attack',
          code: 'NONCE_REQUIRED'
        });
      }

      const timestampNum = parseInt(timestamp);
      if (isNaN(timestampNum)) {
        return res.status(400).json({
          success: false,
          error: 'Format timestamp tidak valid',
          code: 'INVALID_TIMESTAMP_FORMAT'
        });
      }

      if (typeof nonce !== 'string' || nonce.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Format nonce tidak valid. Nonce harus string minimal 8 karakter',
          code: 'INVALID_NONCE_FORMAT'
        });
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timestampDiff = Math.abs(currentTimestamp - timestampNum);
      
      if (timestampDiff > TIMESTAMP_VALID_WINDOW) {
        return res.status(401).json({
          success: false,
          error: `Timestamp tidak valid. Harus dalam ${TIMESTAMP_VALID_WINDOW / 60} menit terakhir`,
          code: 'TIMESTAMP_EXPIRED',
          detail: {
            current: currentTimestamp,
            received: timestampNum,
            difference: timestampDiff
          }
        });
      }

      const nonceCacheKey = `hmac_nonce_${nonce}`;
      const usedNonce = cache.get(nonceCacheKey);
      
      if (usedNonce) {
        return res.status(401).json({
          success: false,
          error: 'Nonce sudah pernah digunakan. Request ini mungkin merupakan replay attack',
          code: 'NONCE_ALREADY_USED',
          detail: {
            nonce: nonce,
            firstUsedAt: usedNonce
          }
        });
      }

      cache.set(nonceCacheKey, {
        timestamp: timestampNum,
        usedAt: currentTimestamp,
        path: req.path
      }, NONCE_CACHE_TTL);

      const body = req.body || {};
      
      const dataToVerify = {};
      
      if (body.type !== undefined && body.type !== null) {
        dataToVerify.type = body.type;
      }
      if (body.latitude !== undefined && body.latitude !== null) {
        dataToVerify.latitude = body.latitude;
      }
      if (body.longitude !== undefined && body.longitude !== null) {
        dataToVerify.longitude = body.longitude;
      }
      if (body.lokasi_id !== undefined && body.lokasi_id !== null) {
        dataToVerify.lokasi_id = body.lokasi_id;
      }
      
      if (body.id_kegiatan !== undefined && body.id_kegiatan !== null) {
        dataToVerify.id_kegiatan = body.id_kegiatan;
      }
      
      dataToVerify.timestamp = timestampNum;
      dataToVerify.nonce = nonce;

      if (Object.keys(dataToVerify).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Request body tidak valid atau kosong',
          code: 'INVALID_REQUEST_BODY'
        });
      }

      const isValid = verifyHMAC(dataToVerify, hmacSignature);
      
      if (!isValid) {
        cache.del(nonceCacheKey);
        return res.status(401).json({
          success: false,
          error: 'HMAC signature tidak valid',
          code: 'HMAC_SIGNATURE_INVALID'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Kesalahan dalam validasi HMAC',
        code: 'HMAC_VALIDATION_ERROR'
      });
    }
  };
};

module.exports = {
  validateHMAC
};

