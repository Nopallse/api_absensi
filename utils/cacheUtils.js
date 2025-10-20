const NodeCache = require('node-cache');

// Cache dengan TTL 5 menit untuk data yang sering diakses
const cache = new NodeCache({ 
  stdTTL: 300, // 5 menit
  checkperiod: 60, // Check expired keys setiap 1 menit
  useClones: false // Lebih efisien memory
});

// Cache untuk data user (TTL 10 menit)
const userCache = new NodeCache({ 
  stdTTL: 600, // 10 menit
  checkperiod: 120,
  useClones: false
});

// Cache untuk data kegiatan (TTL 2 menit karena sering berubah)
const kegiatanCache = new NodeCache({ 
  stdTTL: 120, // 2 menit
  checkperiod: 30,
  useClones: false
});

// Cache untuk data lokasi (TTL 30 menit karena jarang berubah)
const lokasiCache = new NodeCache({ 
  stdTTL: 1800, // 30 menit
  checkperiod: 300,
  useClones: false
});

/**
 * Generic cache wrapper
 */
const cacheWrapper = async (cacheInstance, key, fetchFunction, ttl = null) => {
  try {
    // Cek cache dulu
    const cached = cacheInstance.get(key);
    if (cached) {
      console.log(`Cache HIT for key: ${key}`);
      return cached;
    }

    // Jika tidak ada di cache, fetch dari database
    console.log(`Cache MISS for key: ${key}`);
    const data = await fetchFunction();
    
    // Simpan ke cache
    if (ttl) {
      cacheInstance.set(key, data, ttl);
    } else {
      cacheInstance.set(key, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Cache error for key ${key}:`, error);
    // Jika cache error, langsung fetch dari database
    return await fetchFunction();
  }
};

/**
 * Cache untuk data user
 */
const getUserFromCache = async (userId, fetchFunction) => {
  return cacheWrapper(userCache, `user_${userId}`, fetchFunction);
};

/**
 * Cache untuk data kegiatan
 */
const getKegiatanFromCache = async (kegiatanId, fetchFunction) => {
  return cacheWrapper(kegiatanCache, `kegiatan_${kegiatanId}`, fetchFunction);
};

/**
 * Cache untuk data lokasi
 */
const getLokasiFromCache = async (lokasiId, fetchFunction) => {
  return cacheWrapper(lokasiCache, `lokasi_${lokasiId}`, fetchFunction);
};

/**
 * Cache untuk data kegiatan hari ini
 */
const getTodayKegiatanFromCache = async (userNip, fetchFunction) => {
  const today = new Date().toISOString().split('T')[0];
  return cacheWrapper(kegiatanCache, `today_kegiatan_${userNip}_${today}`, fetchFunction, 60); // TTL 1 menit
};

/**
 * Invalidate cache
 */
const invalidateCache = (cacheInstance, pattern) => {
  const keys = cacheInstance.keys();
  const regex = new RegExp(pattern);
  const keysToDelete = keys.filter(key => regex.test(key));
  
  if (keysToDelete.length > 0) {
    cacheInstance.del(keysToDelete);
    console.log(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }
};

/**
 * Invalidate user cache
 */
const invalidateUserCache = (userId) => {
  invalidateCache(userCache, `user_${userId}`);
};

/**
 * Invalidate kegiatan cache
 */
const invalidateKegiatanCache = (kegiatanId) => {
  invalidateCache(kegiatanCache, `kegiatan_${kegiatanId}`);
  // Juga invalidate today kegiatan cache
  invalidateCache(kegiatanCache, 'today_kegiatan_');
};

/**
 * Invalidate lokasi cache
 */
const invalidateLokasiCache = (lokasiId) => {
  invalidateCache(lokasiCache, `lokasi_${lokasiId}`);
};

/**
 * Clear all caches
 */
const clearAllCaches = () => {
  cache.flushAll();
  userCache.flushAll();
  kegiatanCache.flushAll();
  lokasiCache.flushAll();
  console.log('All caches cleared');
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return {
    general: cache.getStats(),
    user: userCache.getStats(),
    kegiatan: kegiatanCache.getStats(),
    lokasi: lokasiCache.getStats()
  };
};

module.exports = {
  cache,
  userCache,
  kegiatanCache,
  lokasiCache,
  cacheWrapper,
  getUserFromCache,
  getKegiatanFromCache,
  getLokasiFromCache,
  getTodayKegiatanFromCache,
  invalidateCache,
  invalidateUserCache,
  invalidateKegiatanCache,
  invalidateLokasiCache,
  clearAllCaches,
  getCacheStats
};