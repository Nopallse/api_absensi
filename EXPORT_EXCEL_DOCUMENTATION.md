# Export Excel Presensi Documentation

## Overview
Fitur export presensi ke Excel yang mendukung filter berdasarkan tanggal dan lokasi untuk presensi harian dan bulanan.

## Endpoints

### 1. Export Presensi Harian
**GET** `/api/admin/kehadiran/export/harian`  
**GET** `/api/admin-opd/kehadiran/export/harian`

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tanggal` | string | ✅ | Tanggal presensi (format: YYYY-MM-DD) |
| `lokasi_id` | integer | ❌ | ID lokasi untuk filter |
| `search` | string | ❌ | Search by NIP, username, atau email |
| `status` | string | ❌ | Filter by status (HAP, TAP, HAS, CP) |

#### Example Request
```bash
GET /api/admin/kehadiran/export/harian?tanggal=2024-01-15&lokasi_id=1&status=HAP
```

#### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="Presensi_Harian_2024_01_15_Lokasi_Name.xlsx"`
- **File**: Excel file dengan 2 sheets

#### Excel Structure - Presensi Harian

**Sheet 1: Data Presensi**
| Column | Description |
|--------|-------------|
| No | Nomor urut |
| NIP | NIP pegawai |
| Nama | Username pegawai |
| Email | Email pegawai |
| Level | Level user |
| Tanggal | Tanggal presensi |
| Jam Absen | Jam absen |
| Check In | Jam check in |
| Check Out | Jam check out |
| Kategori | Kategori kehadiran |
| Apel Pagi | Status apel pagi (HAP/TAP) |
| Apel Sore | Status apel sore (HAS/CP) |
| Lokasi | Nama lokasi |
| Koordinat | Latitude, Longitude |

**Sheet 2: Ringkasan**
- Tanggal
- Lokasi
- Total Data

---

### 2. Export Presensi Bulanan
**GET** `/api/admin/kehadiran/export/bulanan`  
**GET** `/api/admin-opd/kehadiran/export/bulanan`

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `year` | integer | ❌ | Tahun (default: tahun saat ini) |
| `month` | integer | ❌ | Bulan 1-12 (default: bulan saat ini) |
| `lokasi_id` | integer | ❌ | ID lokasi untuk filter |
| `user_id` | string | ❌ | NIP user untuk filter |

#### Example Request
```bash
GET /api/admin/kehadiran/export/bulanan?year=2024&month=1&lokasi_id=1
```

#### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="Presensi_Bulanan_Januari_2024_Lokasi_Name.xlsx"`
- **File**: Excel file dengan 2 sheets

#### Excel Structure - Presensi Bulanan

**Sheet 1: Data Presensi**
- Sama dengan presensi harian
- Data untuk seluruh bulan yang dipilih

**Sheet 2: Ringkasan Statistik**
| Kategori | Jumlah |
|----------|--------|
| Total Kehadiran | Total data presensi |
| Hadir | Jumlah hadir |
| Hadir Apel Pagi (HAP) | Jumlah HAP |
| Telat Apel Pagi (TAP) | Jumlah TAP |
| Hadir Apel Sore (HAS) | Jumlah HAS |
| Cepat Pulang (CP) | Jumlah CP |

---

## Filter Options

### 1. Filter Tanggal
- **Harian**: Wajib parameter `tanggal`
- **Bulanan**: Optional parameter `year` dan `month`

### 2. Filter Lokasi
- Parameter `lokasi_id` untuk filter berdasarkan lokasi tertentu
- Jika tidak diisi, akan mengambil semua lokasi

### 3. Filter Status
- `HAP` - Hadir Apel Pagi
- `TAP` - Telat Apel Pagi  
- `HAS` - Hadir Apel Sore
- `CP` - Cepat Pulang

### 4. Filter Search
- Search berdasarkan NIP, username, atau email pegawai

### 5. Filter User (Bulanan)
- Parameter `user_id` untuk filter berdasarkan NIP pegawai tertentu

---

## Authentication

### Required Headers
```
Authorization: Bearer <access_token>
```

### Access Level
- **Super Admin** (Level 1): Akses penuh
- **Admin OPD** (Level 2): Akses terbatas sesuai SKPD

---

## Error Handling

### 400 Bad Request
```json
{
  "success": false,
  "error": "Parameter tanggal wajib diisi"
}
```

### 401 Unauthorized
```json
{
  "error": "Token tidak valid"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Gagal export presensi harian",
  "message": "Error details"
}
```

---

## Frontend Implementation

### 1. Export Presensi Harian
```javascript
const exportPresensiHarian = async (tanggal, lokasiId, status, search) => {
  const params = new URLSearchParams({
    tanggal: tanggal
  });
  
  if (lokasiId) params.append('lokasi_id', lokasiId);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  
  const response = await fetch(`/api/admin/kehadiran/export/harian?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_Harian_${tanggal}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
```

### 2. Export Presensi Bulanan
```javascript
const exportPresensiBulanan = async (year, month, lokasiId, userId) => {
  const params = new URLSearchParams({
    year: year,
    month: month
  });
  
  if (lokasiId) params.append('lokasi_id', lokasiId);
  if (userId) params.append('user_id', userId);
  
  const response = await fetch(`/api/admin/kehadiran/export/bulanan?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_Bulanan_${month}_${year}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};
```

### 3. React Component Example
```jsx
import React, { useState } from 'react';

const ExportPresensi = () => {
  const [filters, setFilters] = useState({
    tanggal: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    lokasi_id: '',
    status: '',
    search: ''
  });

  const handleExportHarian = async () => {
    if (!filters.tanggal) {
      alert('Tanggal wajib diisi');
      return;
    }
    
    await exportPresensiHarian(
      filters.tanggal,
      filters.lokasi_id,
      filters.status,
      filters.search
    );
  };

  const handleExportBulanan = async () => {
    await exportPresensiBulanan(
      filters.year,
      filters.month,
      filters.lokasi_id,
      filters.user_id
    );
  };

  return (
    <div>
      <h3>Export Presensi</h3>
      
      {/* Filter Form */}
      <div>
        <label>Tanggal (Harian):</label>
        <input 
          type="date" 
          value={filters.tanggal}
          onChange={(e) => setFilters({...filters, tanggal: e.target.value})}
        />
      </div>
      
      <div>
        <label>Tahun (Bulanan):</label>
        <input 
          type="number" 
          value={filters.year}
          onChange={(e) => setFilters({...filters, year: e.target.value})}
        />
      </div>
      
      <div>
        <label>Bulan (Bulanan):</label>
        <select 
          value={filters.month}
          onChange={(e) => setFilters({...filters, month: e.target.value})}
        >
          <option value={1}>Januari</option>
          <option value={2}>Februari</option>
          {/* ... other months */}
        </select>
      </div>
      
      <div>
        <label>Lokasi:</label>
        <select 
          value={filters.lokasi_id}
          onChange={(e) => setFilters({...filters, lokasi_id: e.target.value})}
        >
          <option value="">Semua Lokasi</option>
          {/* Lokasi options */}
        </select>
      </div>
      
      <div>
        <label>Status:</label>
        <select 
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
        >
          <option value="">Semua Status</option>
          <option value="HAP">Hadir Apel Pagi</option>
          <option value="TAP">Telat Apel Pagi</option>
          <option value="HAS">Hadir Apel Sore</option>
          <option value="CP">Cepat Pulang</option>
        </select>
      </div>
      
      <div>
        <label>Search:</label>
        <input 
          type="text" 
          placeholder="NIP, Username, atau Email"
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
        />
      </div>
      
      {/* Export Buttons */}
      <button onClick={handleExportHarian}>
        Export Harian
      </button>
      
      <button onClick={handleExportBulanan}>
        Export Bulanan
      </button>
    </div>
  );
};

export default ExportPresensi;
```

---

## Testing

### Test Export Harian
```bash
curl -X GET "http://localhost:3000/api/admin/kehadiran/export/harian?tanggal=2024-01-15&lokasi_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o "presensi_harian.xlsx"
```

### Test Export Bulanan
```bash
curl -X GET "http://localhost:3000/api/admin/kehadiran/export/bulanan?year=2024&month=1&lokasi_id=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o "presensi_bulanan.xlsx"
```

---

## Logging

Setiap export akan dicatat dalam admin logs:
- **Action**: EXPORT
- **Resource**: presensi_harian / presensi_bulanan
- **Description**: Detail filter yang digunakan

---

**Last Updated**: January 2024  
**Version**: 1.0.0
