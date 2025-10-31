const { verifyHMAC } = require('../utils/hmacUtils');
const { cache } = require('../utils/cacheUtils');

// Batas waktu valid untuk timestamp (5 menit dalam detik)
const TIMESTAMP_VALID_WINDOW = 5 * 60; // 5 menit
// TTL untuk nonce cache (6 menit untuk memberikan buffer)
const NONCE_CACHE_TTL = 6 * 60; // 6 menit

/**
 * Middleware untuk memvalidasi HMAC signature pada request
 * Mencegah replay attack dengan timestamp + nonce validation
 * 
 * @returns {Function} Express middleware function
 */
const validateHMAC = () => {
  return (req, res, next) => {
    try {
      // Ambil HMAC signature, timestamp, dan nonce dari header
      const hmacSignature = req.headers['x-hmac-signature'] || req.headers['hmac-signature'];
      const timestamp = req.headers['x-timestamp'] || req.body?.timestamp;
      const nonce = req.headers['x-nonce'] || req.body?.nonce;
      
      console.log('=== HMAC MIDDLEWARE DEBUG ===');
      console.log('HMAC Signature:', hmacSignature);
      console.log('Timestamp:', timestamp);
      console.log('Nonce:', nonce);
      
      // Validasi semua field wajib ada
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

      // Validasi format timestamp
      const timestampNum = parseInt(timestamp);
      if (isNaN(timestampNum)) {
        return res.status(400).json({
          success: false,
          error: 'Format timestamp tidak valid',
          code: 'INVALID_TIMESTAMP_FORMAT'
        });
      }

      // Validasi format nonce (harus string dan cukup panjang)
      if (typeof nonce !== 'string' || nonce.length < 8) {
        return res.status(400).json({
          success: false,
          error: 'Format nonce tidak valid. Nonce harus string minimal 8 karakter',
          code: 'INVALID_NONCE_FORMAT'
        });
      }

      // Validasi timestamp masih dalam batas waktu (5 menit)
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timestampDiff = Math.abs(currentTimestamp - timestampNum);
      
      console.log('Current Timestamp:', currentTimestamp);
      console.log('Request Timestamp:', timestampNum);
      console.log('Difference:', timestampDiff, 'detik');
      
      if (timestampDiff > TIMESTAMP_VALID_WINDOW) {
        console.log('❌ Timestamp expired atau terlalu lama!');
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

      // Validasi nonce belum pernah digunakan (replay attack prevention)
      const nonceCacheKey = `hmac_nonce_${nonce}`;
      const usedNonce = cache.get(nonceCacheKey);
      
      if (usedNonce) {
        console.log('❌ NONCE SUDAH PERNAH DIGUNAKAN! Replay attack terdeteksi!');
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

      // Simpan nonce ke cache untuk mencegah penggunaan ulang
      cache.set(nonceCacheKey, {
        timestamp: timestampNum,
        usedAt: currentTimestamp,
        path: req.path
      }, NONCE_CACHE_TTL);

      console.log('✅ Nonce valid, disimpan ke cache');

      // Siapkan data untuk verifikasi
      const body = req.body || {};
      
      console.log('Request Body Original:', JSON.stringify(body, null, 2));
      
      // Buat objek data yang akan di-hash (termasuk timestamp dan nonce)
      const dataToVerify = {};
      
      // Field untuk createKehadiranBiasa
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
      
      // Field untuk createKehadiranKegiatan
      if (body.id_kegiatan !== undefined && body.id_kegiatan !== null) {
        dataToVerify.id_kegiatan = body.id_kegiatan;
      }
      
      // Tambahkan timestamp dan nonce ke data yang di-hash
      dataToVerify.timestamp = timestampNum;
      dataToVerify.nonce = nonce;

      console.log('Data yang akan di-hash (dataToVerify):', JSON.stringify(dataToVerify, null, 2));

      // Pastikan minimal ada field yang akan di-hash
      if (Object.keys(dataToVerify).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Request body tidak valid atau kosong',
          code: 'INVALID_REQUEST_BODY'
        });
      }

      // Verify HMAC signature
      console.log('Memverifikasi HMAC signature...');
      const isValid = verifyHMAC(dataToVerify, hmacSignature);
      console.log('Hasil Verifikasi HMAC:', isValid ? 'VALID' : 'INVALID');
      
      if (!isValid) {
        // Jika HMAC invalid, hapus nonce dari cache (karena request tidak berhasil)
        cache.del(nonceCacheKey);
        console.log('⚠️  HMAC invalid, nonce dihapus dari cache');
      }
      
      console.log('=== END HMAC DEBUG ===\n');

      if (!isValid) {
        console.error('HMAC verification failed:', {
          path: req.path,
          method: req.method,
          signature: hmacSignature,
          body: dataToVerify
        });
        
        return res.status(401).json({
          success: false,
          error: 'HMAC signature tidak valid',
          code: 'HMAC_SIGNATURE_INVALID'
        });
      }

      // HMAC valid, timestamp valid, dan nonce unique - lanjutkan
      next();
    } catch (error) {
      console.error('HMAC Middleware Error:', error);
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

