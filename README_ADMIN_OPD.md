# API Admin OPD

## Endpoint Login Admin OPD

### POST /auth/admin-opd/login

Login untuk admin OPD dengan validasi relasi ke tabel `adm_opd`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Headers:**
```
Device_Id: string (optional)
```

**Response Success (200):**
```json
{
  "message": "Login admin OPD berhasil",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "level": "string",
    "status": "string",
    "device_id": "string"
  },
  "admin_opd": {
    "admopd_id": 1,
    "id_skpd": "string",
    "id_satker": "string",
    "id_bidang": "string",
    "kategori": "string"
  }
}
```

**Response Error (401):**
```json
{
  "error": "Username atau password salah"
}
```

```json
{
  "error": "Akun ini bukan admin OPD"
}
```

```json
{
  "error": "Device ID ini sudah digunakan oleh akun lain"
}
```

## Endpoint Admin OPD (Memerlukan Authentication)

Semua endpoint di bawah ini memerlukan header Authorization dengan token JWT:

```
Authorization: Bearer <token>
```

### GET /admin-opd/users
Mendapatkan daftar semua user dengan data lengkap.

### GET /admin-opd/users/:id
Mendapatkan detail user berdasarkan ID.

### GET /admin-opd/kehadiran
Mendapatkan daftar semua kehadiran.

### GET /admin-opd/kehadiran/user/:user_id
Mendapatkan kehadiran user tertentu.

### GET /admin-opd/ketidakhadiran
Mendapatkan daftar semua ketidakhadiran.

### GET /admin-opd/permohonan-terlambat
Mendapatkan daftar semua permohonan terlambat.

## Middleware Authentication

Middleware `adminOpdAuthMiddleware` akan:
1. Memvalidasi JWT token
2. Memeriksa apakah user ada di database
3. Memverifikasi bahwa user adalah admin OPD (ada di tabel `adm_opd`)
4. Menambahkan data user dan adminOpd ke `req.user` dan `req.adminOpd`

## Struktur Database

### Tabel adm_opd
- `admopd_id` (Primary Key)
- `id_user` (Foreign Key ke tabel user)
- `id_skpd` (Kode SKPD)
- `id_satker` (Kode Satker)
- `id_bidang` (Kode Bidang)
- `kategori` (Kategori admin)

### Relasi
- `adm_opd.id_user` → `user.id`
- Admin OPD harus memiliki record di tabel `adm_opd`

## Keamanan

1. **Device ID Validation**: Mencegah penggunaan device yang sama oleh multiple user
2. **JWT Token**: Token dengan expiry 24 jam
3. **Role-based Access**: Hanya admin OPD yang dapat mengakses endpoint
4. **Password Hashing**: Password di-hash menggunakan bcrypt 