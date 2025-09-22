# 📚 API Documentation - Swagger UI

Dokumentasi interaktif untuk API Absensi System menggunakan Swagger UI.

## 🚀 Akses Dokumentasi

### Admin Panel Documentation
- **URL:** http://localhost:3000/api/docs/admin
- **Deskripsi:** Dokumentasi lengkap untuk semua endpoint admin dan super admin
- **Swagger Spec:** http://localhost:3000/api/docs/admin-api.yaml

### Index Documentation
- **URL:** http://localhost:3000/api/docs
- **Deskripsi:** Halaman index dengan list semua dokumentasi yang tersedia

## 🔐 Cara Menggunakan

### 1. Mendapatkan JWT Token
Sebelum menggunakan endpoint yang memerlukan autentikasi, dapatkan JWT token melalui login:

```bash
POST /api/auth/admin/login
Content-Type: application/json

{
  "nip": "your_nip",
  "password": "your_password"
}
```

### 2. Autentikasi di Swagger UI
1. Buka dokumentasi di browser: http://localhost:3000/api/docs/admin
2. Klik tombol **"Authorize"** di bagian atas
3. Masukkan token dalam format: `Bearer your_jwt_token_here`
4. Klik **"Authorize"**

### 3. Testing Endpoints
- Setelah autentikasi, Anda dapat mencoba semua endpoint langsung dari UI
- Klik **"Try it out"** pada endpoint yang ingin ditest
- Isi parameter yang diperlukan
- Klik **"Execute"** untuk menjalankan request

## 📋 Level Akses Admin

### Super Admin (Level 1)
- Akses penuh ke semua endpoint sistem
- Dapat mengelola semua SKPD, Satker, dan Bidang
- Akses ke system settings dan konfigurasi global

### Admin OPD (Level 2)
- Akses terbatas ke SKPD yang ditugaskan
- Dapat mengelola Satker dan Bidang di bawah SKPD mereka
- Tidak dapat mengakses system settings

### Admin UPT (Level 3)
- Akses terbatas ke Satker yang ditugaskan
- Dapat mengelola Bidang di bawah Satker mereka
- Akses paling terbatas

## 🛠️ Fitur Dokumentasi

### Swagger UI Features
- **Interactive Testing:** Test endpoint langsung dari browser
- **Authentication:** Built-in JWT token management
- **Request/Response Examples:** Contoh lengkap untuk setiap endpoint
- **Schema Documentation:** Detail struktur data untuk semua model
- **Error Handling:** Dokumentasi lengkap kode error dan handling

### Endpoint Categories
1. **Authentication:** Login admin, refresh token, logout
2. **User Management:** CRUD operasi untuk user dan admin
3. **Organization:** Manajemen SKPD, Satker, dan Bidang
4. **Location Management:** CRUD lokasi presensi
5. **Schedule Management:** Jam dinas, jadwal kegiatan
6. **Attendance:** Sistem presensi dengan validasi
7. **System Settings:** Konfigurasi sistem
8. **Device Management:** Reset device, notifikasi
9. **Reports:** Export data dan laporan

## 📁 File Structure

```
swagger/
├── admin-api.yaml          # Swagger specification file
├── admin-docs.html         # HTML interface untuk admin docs
└── README.md              # Documentation guide (this file)

routes/
└── docs.js                # Express routes untuk dokumentasi
```

## 🔧 Custom Configuration

### Modify Documentation
1. Edit `swagger/admin-api.yaml` untuk mengubah API specification
2. Edit `swagger/admin-docs.html` untuk mengubah UI interface
3. Restart server untuk melihat perubahan

### Add New Endpoints
1. Tambahkan path baru di `admin-api.yaml`
2. Definisikan request/response schema
3. Tambahkan tag dan description yang sesuai

## 🚨 Security Notes

- **Semua endpoint memerlukan autentikasi JWT**
- **Token memiliki expiration time (default 1 jam)**
- **Refresh token untuk memperpanjang session**
- **HMAC validation untuk endpoint sensitif**
- **Rate limiting direkomendasikan untuk production**

## 📞 Support

Jika ada pertanyaan atau issue terkait dokumentasi:
1. Check console log di browser untuk error details
2. Pastikan server running dan accessible
3. Verify JWT token masih valid
4. Check network connectivity

---

**Happy Testing! 🎉**