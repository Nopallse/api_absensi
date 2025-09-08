# API Absensi - Sistem Absensi Digital

API backend untuk sistem absensi digital yang mendukung multiple level admin dan integrasi dengan database master pegawai.

## 🚀 Features

### 🔐 Authentication & Authorization
- **JWT Authentication** dengan refresh token
- **Multi-level Admin System**:
  - Superadmin (Level 1)
  - Admin OPD (Level 2) 
  - Admin UPT (Level 3)
  - Regular User (Level 11)
- **Role-based Access Control** untuk setiap endpoint

### 👥 User Management
- **User Registration & Login** dengan validasi
- **Profile Management** dengan foto profil
- **Password Reset** via email
- **User Search & Filtering** dengan pagination
- **Integration dengan Master Database** (MstPegawai, SkpdTbl, SatkerTbl, BidangTbl)

### 📍 Location & Schedule Management
- **Lokasi Management** dengan koordinat GPS
- **Jadwal Kegiatan** dengan lokasi dan SKPD
- **Jam Dinas** dengan detail per hari
- **System Settings** untuk konfigurasi aplikasi

### 📊 Attendance System
- **Kehadiran Recording** dengan GPS tracking
- **Permohonan Terlambat** dengan approval workflow
- **Device Reset Requests** untuk reset device absensi

### 📈 Reporting & Export
- **Dashboard Analytics** dengan statistik kehadiran
- **Excel Export** untuk presensi harian dan bulanan
- **Filtered Reports** berdasarkan tanggal, lokasi, status
- **Admin Logging** untuk audit trail

### 🔧 Admin Features
- **Admin Logs** untuk tracking semua aktivitas admin
- **System Monitoring** dengan health checks
- **Data Management** untuk master data
- **Bulk Operations** untuk data processing

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL (dual database setup)
- **ORM**: Sequelize
- **Authentication**: JWT + bcryptjs
- **File Upload**: Multer
- **Excel Export**: ExcelJS
- **Validation**: Express-validator
- **Documentation**: Swagger

## 📦 Installation

### Prerequisites
- Node.js (v16+)
- MySQL (v8+)
- npm atau yarn

### 1. Clone Repository
```bash
git clone <repository-url>
cd api_absensi
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp env.example .env
```

Edit `.env` file dengan konfigurasi database dan aplikasi:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ekin
DB_USER=root
DB_PASSWORD=your_password

# Master Database Configuration
MASTER_DB_HOST=localhost
MASTER_DB_PORT=3306
MASTER_DB_NAME=esdamparkotagopar
MASTER_DB_USER=root
MASTER_DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 4. Database Setup
```bash
# Create databases
npm run db:create

# Run migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### 5. Start Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🐳 Docker Setup

### Development Environment
```bash
# Build and run with Docker Compose
npm run docker:dev

# Run in detached mode
npm run docker:dev:detached

# Stop containers
npm run docker:dev:down
```

### Production Environment
```bash
# Build and run production
npm run docker:prod

# Run in detached mode
npm run docker:prod:detached

# Stop containers
npm run docker:prod:down
```

### Docker Commands
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# View logs
npm run docker:logs
npm run docker:logs:api
```

## 📚 API Documentation

### Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

### Authentication Endpoints
```
POST /auth/register          # User registration
POST /auth/login             # User login
POST /auth/refresh           # Refresh token
POST /auth/logout            # User logout
POST /auth/forgot-password   # Forgot password
POST /auth/reset-password    # Reset password
```

### User Management
```
GET    /users                # Get all users
GET    /users/:id            # Get user by ID
PUT    /users/:id            # Update user
DELETE /users/:id            # Delete user
POST   /users/search         # Search users
```

### Admin Endpoints
```
GET    /admin/users          # Admin: Get all users
POST   /admin/register       # Admin: Register new user
PUT    /admin/users/:id      # Admin: Update user
DELETE /admin/users/:id      # Admin: Delete user
GET    /admin/logs           # Admin: Get admin logs
```

### Attendance Endpoints
```
GET    /kehadiran            # Get attendance records
POST   /kehadiran            # Record attendance
GET    /kehadiran/export/harian    # Export daily attendance
GET    /kehadiran/export/bulanan   # Export monthly attendance
```

### Location Management
```
GET    /lokasi               # Get all locations
POST   /lokasi               # Create location
PUT    /lokasi/:id           # Update location
DELETE /lokasi/:id           # Delete location
```

## 🔧 Database Schema

### Main Database (ekin)
- `user` - User accounts
- `kehadiran` - Attendance records
- `lokasi` - Location data
- `jam_dinas` - Work hours
- `jadwal_kegiatan` - Activity schedules
- `admin_logs` - Admin activity logs

### Master Database (esdamparkotagopar)
- `MstPegawai` - Employee master data
- `SkpdTbl` - SKPD (Satuan Kerja Perangkat Daerah)
- `SatkerTbl` - Satker (Satuan Kerja)
- `BidangTbl` - Bidang (Department)

## 🚀 Usage Examples

### 1. User Registration
```javascript
POST /auth/register
{
  "username": "197903232011011003",
  "email": "user@example.com",
  "password": "password123",
  "level": 11
}
```

### 2. User Login
```javascript
POST /auth/login
{
  "username": "197903232011011003",
  "password": "password123"
}
```

### 3. Record Attendance
```javascript
POST /kehadiran
{
  "lokasi_id": 1,
  "absen_tgl": "2025-01-15",
  "absen_checkin": "08:00:00",
  "absen_checkout": "17:00:00"
}
```

### 4. Export Attendance
```javascript
GET /admin/kehadiran/export/harian?tanggal=2025-01-15
GET /admin/kehadiran/export/bulanan?year=2025&month=1
```

## 🔒 Security Features

- **JWT Authentication** dengan refresh token
- **Password Hashing** menggunakan bcryptjs
- **Input Validation** dengan express-validator
- **CORS Protection** untuk cross-origin requests
- **Admin Logging** untuk audit trail
- **Role-based Access Control** untuk endpoint protection

## 📊 Monitoring & Logging

### Admin Logs
Semua aktivitas admin dicatat dalam database:
- **Action Type**: POST, PUT, PATCH, DELETE
- **Endpoint**: URL yang diakses
- **User Agent**: Browser/client information
- **IP Address**: Client IP address
- **Timestamp**: Waktu aksi
- **Data**: Request data (sanitized)

### Health Checks
```
GET /health - Application health status
GET /admin/logs/stats - Admin logs statistics
```

## 🧪 Testing

### Manual Testing
```bash
# Test database connection
npm run db:migrate:status

# Test API endpoints
curl http://localhost:3000/health
```

### Debug Endpoints
```
GET /admin/debug/export/harian?tanggal=2025-01-15
GET /admin/debug/users?limit=10
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check database credentials in `.env`
   - Ensure MySQL service is running
   - Verify database exists

2. **JWT Token Error**
   - Check JWT_SECRET in `.env`
   - Verify token expiration
   - Check token format

3. **Export Excel Error**
   - Check file permissions
   - Verify data exists
   - Check console logs for errors

4. **Docker Issues**
   - Check Docker service status
   - Verify port availability
   - Check container logs

### Debug Commands
```bash
# Check database status
npm run db:migrate:status

# View application logs
npm run docker:logs:api

# Check container status
docker ps
```

## 📝 Development

### Project Structure
```
api_absensi/
├── config/           # Database and app configuration
├── controllers/      # API controllers
├── middlewares/      # Express middlewares
├── models/          # Sequelize models
├── routes/          # API routes
├── utils/           # Utility functions
├── migrations/      # Database migrations
├── seeders/         # Database seeders
├── uploads/         # File uploads
└── tests/           # Test files
```

### Adding New Features
1. Create model in `models/`
2. Create migration in `migrations/`
3. Create controller in `controllers/`
4. Add routes in `routes/`
5. Update documentation

### Code Style
- Use ES6+ features
- Follow async/await pattern
- Add proper error handling
- Include input validation
- Add comprehensive logging

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**API Absensi v1.0.0** - Sistem Absensi Digital yang Powerful dan Scalable! 🚀
