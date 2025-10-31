// Utility functions untuk mengelola timezone dan jam kerja

/**
 * Mendapatkan waktu saat ini dalam WIB (UTC+7)
 * @returns {Date} Waktu saat ini dalam WIB
 */
const getWIBDate = () => {
    // Mendapatkan waktu sekarang dalam UTC
    const now = new Date();
    // Tambahkan offset +7 jam (WIB) dalam milidetik
    const wib = new Date(now.getTime()  - (now.getTimezoneOffset() * 60 * 1000));
    return wib;
};

/**
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 */
const getTodayDate = () => {
    const now = getWIBDate();
    // Format YYYY-MM-DD dengan memperhatikan timezone lokal
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Mendapatkan tanggal awal dan akhir bulan
 * @param {number} year - Tahun (default: tahun saat ini)
 * @param {number} month - Bulan (default: bulan saat ini)
 * @returns {Object} Object dengan startDate dan endDate
 */
const getMonthRange = (year = new Date().getFullYear(), month = new Date().getMonth() + 1) => {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay}`;
    return { startDate, endDate };
};

/**
 * Mendapatkan tanggal awal dan akhir minggu
 * @param {Date} date - Tanggal referensi (default: hari ini)
 * @returns {Object} Object dengan startDate dan endDate
 */
const getWeekRange = (date = new Date()) => {
    const today = new Date(date);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Awal minggu (Minggu)
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Akhir minggu (Sabtu)
    endOfWeek.setHours(23, 59, 59, 999);

    return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
    };
};

/**
 * Parse jam dari format TIME database ke Date object dalam WIB
 * @param {string} timeString - Jam dalam format HH:MM:SS atau HH:MM
 * @param {Date} baseDate - Tanggal dasar (default: hari ini)
 * @returns {Date} Date object dengan jam yang di-set dalam WIB
 */
const parseTimeToDate = (timeString, baseDate = new Date()) => {
    // Handle format HH:MM:SS dan HH:MM
    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
    
    // Buat tanggal baru dengan tanggal dan jam yang di-set
    const date = new Date(baseDate);
    
    // Set jam, menit, dan detik
    date.setHours(hours, minutes, seconds, 0);
    
    return date;
};

/**
 * Format waktu ke format HH:MM dalam WIB
 * @param {Date} date - Date object (dalam WIB)
 * @returns {string} Waktu dalam format HH:MM dalam WIB
 */
const formatTime = (date) => {
    // Ambil jam dan menit dari date object (sudah dalam timezone lokal)
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format tanggal ke format YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Tanggal dalam format YYYY-MM-DD
 */
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

/**
 * Mendapatkan nama hari dalam bahasa Indonesia
 * @param {Date} date - Date object
 * @returns {string} Nama hari dalam bahasa Indonesia
 */
const getDayName = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
};

/**
 * Mendapatkan nama bulan dalam bahasa Indonesia
 * @param {Date} date - Date object
 * @returns {string} Nama bulan dalam bahasa Indonesia
 */
const getMonthName = (date) => {
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[date.getMonth()];
};

/**
 * Validasi format jam (HH:MM)
 * @param {string} timeString - String jam untuk divalidasi
 * @returns {boolean} True jika format valid
 */
const isValidTimeFormat = (timeString) => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
};

/**
 * Validasi format tanggal (YYYY-MM-DD)
 * @param {string} dateString - String tanggal untuk divalidasi
 * @returns {boolean} True jika format valid
 */
const isValidDateFormat = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

/**
 * Mendapatkan selisih waktu dalam menit
 * @param {Date} time1 - Waktu pertama
 * @param {Date} time2 - Waktu kedua
 * @returns {number} Selisih dalam menit
 */
const getTimeDifferenceInMinutes = (time1, time2) => {
    const diffMs = Math.abs(time2 - time1);
    return Math.floor(diffMs / (1000 * 60));
};

/**
 * Mendapatkan selisih waktu dalam jam
 * @param {Date} time1 - Waktu pertama
 * @param {Date} time2 - Waktu kedua
 * @returns {number} Selisih dalam jam
 */
const getTimeDifferenceInHours = (time1, time2) => {
    const diffMs = Math.abs(time2 - time1);
    return Math.floor(diffMs / (1000 * 60 * 60));
};

/**
 * Cek apakah waktu berada dalam rentang
 * @param {Date} time - Waktu yang dicek
 * @param {Date} startTime - Waktu awal
 * @param {Date} endTime - Waktu akhir
 * @returns {boolean} True jika waktu berada dalam rentang
 */
const isTimeInRange = (time, startTime, endTime) => {
    return time >= startTime && time <= endTime;
};

/**
 * Mendapatkan status kehadiran berdasarkan waktu
 * @param {Date} checkinTime - Waktu checkin
 * @param {Date} expectedTime - Waktu yang diharapkan
 * @returns {string} Status kehadiran ('hadir' atau 'telat')
 */
const getAttendanceStatus = (checkinTime, expectedTime) => {
    return checkinTime <= expectedTime ? 'hadir' : 'telat';
};

/**
 * Mendapatkan status checkout berdasarkan waktu
 * @param {Date} checkoutTime - Waktu checkout
 * @param {Date} expectedTime - Waktu yang diharapkan
 * @returns {string} Status checkout ('HAS' atau 'CP')
 */
const getCheckoutStatus = (checkoutTime, expectedTime) => {
    return checkoutTime >= expectedTime ? 'HAS' : 'CP';
};

/**
 * Mendapatkan status apel berdasarkan waktu
 * @param {Date} checkinTime - Waktu checkin
 * @param {Date} expectedTime - Waktu yang diharapkan
 * @returns {string} Status apel ('HAP' atau 'TAP')
 */
const getApelStatus = (checkinTime, expectedTime) => {
    return checkinTime <= expectedTime ? 'HAP' : 'TAP';
};

module.exports = {
    getWIBDate,
    getTodayDate,
    getMonthRange,
    getWeekRange,
    parseTimeToDate,
    formatTime,
    formatDate,
    getDayName,
    getMonthName,
    isValidTimeFormat,
    isValidDateFormat,
    getTimeDifferenceInMinutes,
    getTimeDifferenceInHours,
    isTimeInRange,
    getAttendanceStatus,
    getCheckoutStatus,
    getApelStatus
}; 