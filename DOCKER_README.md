# Docker Setup untuk API Absensi

## 🐳 Overview

Project ini sudah dikonfigurasi untuk berjalan dengan Docker. Setup ini mencakup:

- **API Application** (Node.js/Express)
- **Main Database** (MySQL 8.0) - Database utama aplikasi
- **Master Database** (MySQL 8.0) - Database master untuk data pegawai
- **Nginx** (Production only) - Reverse proxy dan load balancer

## 📋 Prerequisites

- Docker & Docker Compose terinstall
- Port 3000, 3306, 3307 tersedia

## 🚀 Quick Start

### Development Environment

```bash
# Clone repository
git clone <repository-url>
cd api_absensi

# Start semua services
npm run docker:dev

# Atau dengan detached mode
npm run docker:dev:detached
```

### Production Environment

```bash
# Buat file .env untuk production
cp env.example .env

# Edit .env dengan konfigurasi production
# Isi PROD_MAIN_* dan PROD_MASTER_* variables

# Start production services
npm run docker:prod
```

## 📁 File Structure

```
├── Dockerfile                 # Docker image untuk development
├── Dockerfile.prod           # Docker image untuk production (multi-stage)
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
├── .dockerignore            # Files/folders yang diabaikan saat build
├── healthcheck.js           # Health check script
└── DOCKER_README.md         # Dokumentasi ini
```

## 🔧 Available Scripts

### Development
```bash
npm run docker:dev              # Start development environment
npm run docker:dev:detached     # Start in background
npm run docker:dev:down         # Stop development environment
```

### Production
```bash
npm run docker:prod             # Start production environment
npm run docker:prod:detached    # Start in background
npm run docker:prod:down        # Stop production environment
```

### Logs & Monitoring
```bash
npm run docker:logs             # View all logs
npm run docker:logs:api         # View API logs only
```

### Manual Docker Commands
```bash
npm run docker:build            # Build image manually
npm run docker:run              # Run container manually
```

## 🗄️ Database Configuration

### Development
- **Main DB**: `localhost:3306` → `ekin`
- **Master DB**: `localhost:3307` → `esdamparkotagopar`

### Production
- Menggunakan environment variables dari `.env`
- Database credentials harus diisi di `PROD_MAIN_*` dan `PROD_MASTER_*`

## 🌐 Port Mapping

| Service | Development | Production | Description |
|---------|-------------|------------|-------------|
| API | 3000 | 3000 | Main API endpoint |
| Main DB | 3306 | 3306 | Main database |
| Master DB | 3307 | 3306 (internal) | Master database |
| Nginx | - | 80, 443 | Reverse proxy |

## 🔍 Health Check

API menyediakan endpoint health check di `/health` untuk monitoring Docker container.

## 📊 Monitoring

### View Logs
```bash
# Semua services
docker-compose logs -f

# API saja
docker-compose logs -f api

# Database saja
docker-compose logs -f db-main
```

### Container Status
```bash
docker-compose ps
```

### Resource Usage
```bash
docker stats
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port sudah digunakan**
   ```bash
   # Cek port yang digunakan
   netstat -tulpn | grep :3000
   
   # Stop service yang konflik
   sudo systemctl stop <service-name>
   ```

2. **Database connection error**
   ```bash
   # Restart database
   docker-compose restart db-main db-master
   
   # Check database logs
   docker-compose logs db-main
   ```

3. **Permission issues**
   ```bash
   # Fix uploads directory permission
   sudo chown -R $USER:$USER uploads/
   ```

### Reset Everything
```bash
# Stop semua containers
docker-compose down

# Hapus volumes (data akan hilang!)
docker-compose down -v

# Rebuild dan start ulang
docker-compose up --build
```

## 🔒 Security Notes

1. **Production Environment Variables**
   - Ganti semua default passwords
   - Gunakan strong JWT secrets
   - Secure Firebase credentials

2. **Network Security**
   - Database tidak expose ke public di production
   - Gunakan SSL/TLS untuk production
   - Implement proper firewall rules

3. **Container Security**
   - Production image menggunakan non-root user
   - Multi-stage build untuk minimize attack surface
   - Regular security updates

## 📝 Environment Variables

### Required untuk Production
```bash
# Database Production
PROD_MAIN_USERNAME=
PROD_MAIN_PASSWORD=
PROD_MAIN_DATABASE=
PROD_MAIN_HOST=
PROD_MASTER_USERNAME=
PROD_MASTER_PASSWORD=
PROD_MASTER_DATABASE=
PROD_MASTER_HOST=

# JWT Secrets (ganti dengan yang secure)
JWT_SECRET=
JWT_REFRESH_SECRET=
```

## 🚀 Deployment

### Manual Deployment
```bash
# Build production image
docker build -f Dockerfile.prod -t api-absensi:latest .

# Run with production compose
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Integration
File `.github/workflows/deploy.yml` sudah dikonfigurasi untuk deployment otomatis ke server.

## 📞 Support

Jika ada masalah dengan Docker setup, cek:
1. Docker logs: `docker-compose logs`
2. Container status: `docker-compose ps`
3. Resource usage: `docker stats`
4. Network connectivity: `docker network ls`
