const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const kehadiranRoutes = require("./routes/kehadiran");
const usersRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const adminOpdRoutes = require("./routes/adminOpd");
const lokasiRoutes = require("./routes/lokasi");
const lokasiKegiatanRoutes = require("./routes/lokasiKegiatan");
const unitKerjaRoutes = require("./routes/unitKerja");
const jadwalKegiatanRoutes = require("./routes/jadwalKegiatan");
const jadwalKegiatanLokasiSatkerRoutes = require("./routes/jadwalKegiatanLokasiSatker");
const viewDaftarUnitKerjaRoutes = require("./routes/viewDaftarUnitKerja");
const docsRoutes = require("./routes/docs");
const performanceRoutes = require("./routes/performance");
const path = require("path");
const distPath = path.join(__dirname, "../fe/dist");

// Import database connections
const { mainSequelize, masterSequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting untuk mencegah abuse - Optimized for 3000+ users
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 menit
  max: 50, // Maksimal 50 request per menit per IP (untuk 3000 users = 150,000 req/min total)
  message: {
    success: false,
    error: 'Terlalu banyak request, coba lagi nanti'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting untuk health check dan performance monitoring
    return req.path === '/api/performance/stats' || req.path.startsWith('/api/performance/debug');
  }
});

// Middleware
app.use(compression()); // Kompresi response untuk performa lebih baik
app.use(limiter); // Rate limiting
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Device_Id', 'Authorization', 'access-control-allow-methods', 'access-control-allow-origin', 'access-control-allow-headers'],
    credentials: true
}));

app.use(bodyParser.json());
app.use(express.json());

// Sync kedua database
const syncDatabases = async () => {
  try {
    // Sync database utama (tanpa alter untuk menghindari error index)
    await mainSequelize.sync({ force: false });
    console.log('Database utama berhasil disinkronkan');
    
    // Sync database master - hanya model yang perlu dibuat
    const { MstPegawai, SatkerTbl, BidangTbl } = require('./models');
    
    // Sync hanya model yang benar-benar perlu dibuat tabel baru
    // Model yang sudah ada seperti ViewDaftarUnitKerja dan BidangSub tidak perlu di-sync
    await MstPegawai.sync({ force: false });
    await SatkerTbl.sync({ force: false });
    await BidangTbl.sync({ force: false });
    
    console.log('Database master berhasil disinkronkan');
  } catch (error) {
    console.error('Error sinkronisasi database:', error);
  }
};

// Routes - API routes must come BEFORE static file serving
app.use("/api/superadmin", adminRoutes);
app.use("/api/admin", adminOpdRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kehadiran", kehadiranRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/lokasi", lokasiRoutes);
app.use("/api/lokasi-kegiatan", lokasiKegiatanRoutes);
app.use("/api/unit-kerja", unitKerjaRoutes);
app.use("/api/jadwal-kegiatan", jadwalKegiatanRoutes);
app.use("/api/jadwal-kegiatan-lokasi-satker", jadwalKegiatanLokasiSatkerRoutes);
app.use("/api/view-daftar-unit-kerja", viewDaftarUnitKerjaRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/performance", performanceRoutes);

// Static files and catch-all route should come AFTER API routes
app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

// Serve static files for Swagger UI
app.use('/swagger', express.static(path.join(__dirname, 'swagger')));

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    await syncDatabases();
});