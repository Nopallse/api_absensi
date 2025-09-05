# User Master Utils

Utility untuk menghubungkan data antara tabel `user` dan `mstpegawai` yang berada di database berbeda.

## Masalah yang Diatasi

Error: `"SatkerTbl is not associated to MstPegawai!"`

**Penyebab**: Di database tidak ada relasi langsung antara `MstPegawai` dengan `SatkerTbl` dan `BidangTbl`.

**Solusi**: Mengambil data secara terpisah dan menggabungkannya menggunakan Map untuk lookup yang cepat.

## Mapping Data

### Kolom yang Sama:
- `user.username` = `MstPegawai.NIP`

### Relasi Admin:
- `AdmOpd.id_skpd` → `MstPegawai.KDSKPD` → `SkpdTbl`
- `AdmOpd.id_satker` → `MstPegawai.KDSATKER` → `SatkerTbl` (manual lookup)
- `AdmOpd.id_bidang` → `MstPegawai.BIDANGF` → `BidangTbl` (manual lookup)

## Fungsi-fungsi

### `mapUsersWithMasterData(users, options)`
- Mapping array data user dengan data master pegawai
- Mengambil data Satker dan Bidang secara terpisah
- Menggunakan Map untuk lookup yang cepat

### `getUserWithMasterData(userId, options)`
- Mendapatkan data user tunggal dengan data master pegawai
- Include relasi dengan AdmOpd dan AdmUpt

### `getSkpdIdByUserLevel(user, userLevel)`
- Mendapatkan id_skpd berdasarkan level user
- Level 2: dari AdmOpd.id_skpd
- Level 3: dari AdmUpt.id_skpd

### `filterUsersBySkpd(users, id_skpd)`
- Filter users berdasarkan SKPD

### `searchUsersWithMasterData(query, id_skpd, options)`
- Search users dengan master data
- Support filter berdasarkan SKPD

## Cara Kerja

1. **Ambil data MstPegawai** dengan relasi SkpdTbl (yang ada relasinya)
2. **Ambil data Satker dan Bidang secara terpisah** berdasarkan KDSATKER dan BIDANGF
3. **Buat Map** untuk lookup yang cepat
4. **Gabungkan data** menggunakan Map lookup

## Contoh Penggunaan

```javascript
const { mapUsersWithMasterData, getUserWithMasterData } = require('./utils/userMasterUtils');

// Untuk array users
const users = await User.findAll({...});
const usersWithMaster = await mapUsersWithMasterData(users);

// Untuk single user
const userWithMaster = await getUserWithMasterData(userId);
```

## Data yang Dikembalikan

Setiap user akan memiliki data tambahan:
- Data pegawai: nama, nip, kdskpd, kdsatker, bidangf, dll.
- Data relasi: skpd, satker, bidang (dengan nama lengkap)
