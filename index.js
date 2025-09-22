const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const authRoutes = require("./routes/auth");
const kehadiranRoutes = require("./routes/kehadiran");
const usersRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const adminOpdRoutes = require("./routes/adminOpd");
const skpdRoutes = require("./routes/skpd");
const lokasiRoutes = require("./routes/lokasi");
const jadwalKegiatanRoutes = require("./routes/jadwalKegiatan");
const jadwalKegiatanLokasiSkpdRoutes = require("./routes/jadwalKegiatanLokasiSkpd");
const docsRoutes = require("./routes/docs");
const path = require("path");

// Import database connections
const { mainSequelize, masterSequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
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
    
    // Sync database master
    await masterSequelize.sync({ force: false });
    console.log('Database master berhasil disinkronkan');
  } catch (error) {
    console.error('Error sinkronisasi database:', error);
  }
};

// Routes
app.use("/api/superadmin", adminRoutes);
app.use("/api/admin", adminOpdRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/kehadiran", kehadiranRoutes);
app.use("/api/user", usersRoutes);
app.use("/api/skpd", skpdRoutes);
app.use("/api/lokasi", lokasiRoutes);
app.use("/api/jadwal-kegiatan", jadwalKegiatanRoutes);
app.use("/api/jadwal-kegiatan-lokasi-skpd", jadwalKegiatanLokasiSkpdRoutes);
app.use("/api/docs", docsRoutes);

// Serve static files for Swagger UI
app.use('/swagger', express.static(path.join(__dirname, 'swagger')));

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    await syncDatabases();
});