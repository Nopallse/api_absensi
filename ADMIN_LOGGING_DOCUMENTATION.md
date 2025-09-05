# Admin Logging Documentation

## Overview
Sistem logging admin yang hanya aktif untuk aksi **device reset** saja. Setiap kali admin melakukan approve/reject device reset request, aktivitas tersebut akan dicatat ke database dan file log.

## Fitur Logging

### 1. Device Reset Logging
- **Endpoint**: `PUT /api/admin/device-reset-requests/:id`
- **Endpoint**: `PUT /api/admin-opd/device-reset/requests/:id`
- **Aksi**: UPDATE device reset request status
- **Data yang dicatat**:
  - Admin ID, username, dan level
  - Aksi yang dilakukan (UPDATE)
  - Resource (device_reset)
  - ID request yang diupdate
  - IP address admin
  - User agent browser
  - Request data (status baru)
  - Response data
  - Durasi eksekusi

## Database Schema

### Tabel: `admin_logs`
```sql
CREATE TABLE admin_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  admin_username VARCHAR(50) NOT NULL,
  admin_level VARCHAR(10) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id INT,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_data JSON,
  response_status INT,
  response_data JSON,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## File Logs

### 1. Console Logs
- Logs ditampilkan di console dengan format berwarna

### 2. File Logs
- **`logs/admin-actions.log`** - Semua admin actions
- **`logs/admin-errors.log`** - Error logs
- **`logs/admin-YYYY-MM-DD.log`** - Daily rotated logs

## API Endpoints untuk Melihat Logs

### 1. Get All Admin Logs
```
GET /api/admin/admin-logs
```

**Query Parameters:**
- `page` - Halaman (default: 1)
- `limit` - Jumlah per halaman (default: 20)
- `admin_id` - Filter by admin ID
- `action` - Filter by action
- `resource` - Filter by resource
- `start_date` - Filter dari tanggal
- `end_date` - Filter sampai tanggal
- `admin_level` - Filter by level admin
- `search` - Search di description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "admin_id": 1,
      "admin_username": "admin_opd",
      "admin_level": "2",
      "action": "UPDATE",
      "resource": "device_reset",
      "resource_id": 123,
      "description": "Update device reset request",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "request_data": {"status": "approved"},
      "response_status": 200,
      "response_data": {"success": true},
      "duration_ms": 150,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### 2. Get Admin Log by ID
```
GET /api/admin/admin-logs/:id
```

### 3. Get Admin Logs by Admin ID
```
GET /api/admin/admin-logs/admin/:adminId
```

### 4. Get Admin Log Statistics
```
GET /api/admin/admin-logs/stats
```

**Query Parameters:**
- `start_date` - Filter dari tanggal
- `end_date` - Filter sampai tanggal
- `admin_id` - Filter by admin ID

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 150,
    "logsByAction": [
      {"action": "UPDATE", "count": 120},
      {"action": "READ", "count": 30}
    ],
    "logsByResource": [
      {"resource": "device_reset", "count": 120},
      {"resource": "users", "count": 30}
    ],
    "logsByLevel": [
      {"admin_level": "2", "count": 100},
      {"admin_level": "1", "count": 50}
    ],
    "mostActiveAdmins": [
      {
        "admin_id": 1,
        "admin_username": "admin_opd",
        "admin_level": "2",
        "count": 80
      }
    ],
    "recentActivity": [
      {"date": "2024-01-15", "count": 5},
      {"date": "2024-01-14", "count": 3}
    ]
  }
}
```

### 5. Cleanup Old Logs
```
DELETE /api/admin/admin-logs/cleanup
```

**Request Body:**
```json
{
  "days": 90
}
```

## Contoh Log Entry

### Device Reset Approval
```json
{
  "admin_id": 1,
  "admin_username": "admin_opd",
  "admin_level": "2",
  "action": "UPDATE",
  "resource": "device_reset",
  "resource_id": 123,
  "description": "Update device reset request",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "request_data": {
    "status": "approved",
    "admin_notes": "Device reset approved"
  },
  "response_status": 200,
  "response_data": {
    "success": true,
    "message": "Device reset request approved successfully"
  },
  "duration_ms": 150,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

## Security Features

### 1. Data Sanitization
- Password, auth_key, dan token sensitif di-redact
- Request/response data dibersihkan dari data sensitif

### 2. Error Handling
- Jika gagal simpan ke database, tetap log ke file
- Error logging terpisah untuk debugging

### 3. Performance
- Logging tidak memblokir response
- Async logging untuk performa optimal

## Monitoring

### 1. File Monitoring
```bash
# Monitor real-time logs
tail -f logs/admin-actions.log

# Monitor errors
tail -f logs/admin-errors.log
```

### 2. Database Monitoring
```sql
-- Cek total logs hari ini
SELECT COUNT(*) FROM admin_logs 
WHERE DATE(created_at) = CURDATE();

-- Cek admin paling aktif
SELECT admin_username, COUNT(*) as total_actions
FROM admin_logs 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY admin_username 
ORDER BY total_actions DESC;
```

## Maintenance

### 1. Log Rotation
- File logs di-rotate harian
- Maksimal 20MB per file
- Simpan 14 hari terakhir

### 2. Database Cleanup
- Gunakan endpoint cleanup untuk hapus logs lama
- Default: hapus logs > 90 hari
- Bisa disesuaikan sesuai kebutuhan

### 3. Storage Management
- Monitor ukuran database
- Monitor disk space untuk file logs
- Lakukan cleanup berkala

---

**Last Updated**: January 2024  
**Version**: 1.0.0
