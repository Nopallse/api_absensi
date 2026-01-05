require('dotenv').config();
const crypto = require('crypto');

const HMAC_SECRET = process.env.HMAC_SECRET || process.env.JWT_SECRET || 'default-hmac-secret-key';
const HMAC_ALGORITHM = 'sha256';

/**
 * Generate HMAC signature dari data
 * @param {string|object} data - Data yang akan di-hash (bisa string atau object)
 * @returns {string} HMAC signature dalam format hex
 */
const generateHMAC = (data) => {
  try {
    // Convert object to sorted JSON string untuk konsistensi
    const dataString = typeof data === 'string' 
      ? data 
      : JSON.stringify(data, Object.keys(data).sort());
    
    console.log('📝 Data String untuk hash:', dataString);
    
    const hmac = crypto.createHmac(HMAC_ALGORITHM, HMAC_SECRET);
    hmac.update(dataString);
    const signature = hmac.digest('hex');
    
    console.log('🔐 HMAC Signature (hex):', signature);
    
    return signature;
  } catch (error) {
    console.error('Error generating HMAC:', error);
    throw new Error('Gagal menghasilkan HMAC signature');
  }
};

/**
 * Verify HMAC signature
 * @param {string|object} data - Data yang akan di-verify
 * @param {string} signature - HMAC signature yang diterima
 * @returns {boolean} True jika signature valid, false jika tidak
 */
const verifyHMAC = (data, signature) => {
  try {
    if (!signature || typeof signature !== 'string') {
      console.log('⚠️  Signature tidak valid atau kosong');
      return false;
    }

    console.log('\n--- HMAC VERIFY DEBUG ---');
    console.log('Data yang di-verify:', JSON.stringify(data, null, 2));
    console.log('Signature dari client:', signature);
    
    const expectedSignature = generateHMAC(data);
    console.log('Signature yang di-generate:', expectedSignature);
    
    // Pastikan kedua signature memiliki panjang yang sama untuk timingSafeEqual
    if (signature.length !== expectedSignature.length) {
      console.log('❌ Panjang signature tidak sama!');
      console.log('   Client signature length:', signature.length);
      console.log('   Server signature length:', expectedSignature.length);
      return false;
    }
    
    // Gunakan timing-safe comparison untuk mencegah timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    console.log('Hasil perbandingan:', isValid ? '✅ MATCH' : '❌ MISMATCH');
    console.log('--- END VERIFY DEBUG ---\n');
    
    return isValid;
  } catch (error) {
    console.error('Error verifying HMAC:', error);
    return false;
  }
};

/**
 * Generate HMAC dari request body untuk kehadiran
 * @param {object} body - Request body
 * @returns {string} HMAC signature
 */
const generateKehadiranHMAC = (body) => {
  // Ambil field yang relevan untuk kehadiran
  const dataToHash = {
    type: body.type,
    latitude: body.latitude,
    longitude: body.longitude,
    lokasi_id: body.lokasi_id,
    id_kegiatan: body.id_kegiatan
  };
  
  // Hapus field yang undefined
  Object.keys(dataToHash).forEach(key => 
    dataToHash[key] === undefined && delete dataToHash[key]
  );
  console.log(dataToHash);
  console.log(generateHMAC(dataToHash));
  return generateHMAC(dataToHash);
};

/**
 * Generate HMAC dari request body untuk kehadiran dengan timestamp dan nonce
 * @param {object} body - Request body
 * @param {number} timestamp - Unix timestamp (optional, default: current time)
 * @param {string} nonce - Unique nonce untuk request (optional, default: generated)
 * @returns {object} {signature, timestamp, nonce}
 */
const generateKehadiranHMACWithNonce = (body, timestamp = null, nonce = null) => {
  // Generate timestamp dan nonce jika tidak disediakan
  const currentTimestamp = timestamp || Math.floor(Date.now() / 1000);
  const requestNonce = nonce || crypto.randomBytes(16).toString('hex');
  
  // Ambil field yang relevan untuk kehadiran
  const dataToHash = {
    type: body.type,
    latitude: body.latitude,
    longitude: body.longitude,
    lokasi_id: body.lokasi_id,
    id_kegiatan: body.id_kegiatan,
    timestamp: currentTimestamp,
    nonce: requestNonce // Tambahkan nonce ke hash
  };

  console.log(dataToHash);
  
  // Hapus field yang undefined
  Object.keys(dataToHash).forEach(key => 
    dataToHash[key] === undefined && delete dataToHash[key]
  );
  
  const signature = generateHMAC(dataToHash);
  
  return {
    signature,
    timestamp: currentTimestamp,
    nonce: requestNonce
  };
};

module.exports = {
  generateHMAC,
  verifyHMAC,
  generateKehadiranHMAC,
  generateKehadiranHMACWithNonce,
  HMAC_ALGORITHM
};

