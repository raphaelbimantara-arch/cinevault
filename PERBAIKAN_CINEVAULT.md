# Catatan Perbaikan CineVault

Perubahan dalam paket ini:

1. **Date Added / Date Modified film**: menambahkan kolom `modified_date` dan memastikan API memuat serta menyimpan kedua tanggal.
2. **Date Added / Date Modified aktor**: menambahkan kolom tanggal di tabel `actors`, memuat tanggal lewat API, dan memperbarui `modified_date` ketika profil disimpan.
3. **Database kosong**: aplikasi sekarang mempertahankan array `[]` dari localStorage, bukan menganggapnya tidak valid dan memuat ulang film demo. Ini mencegah katalog lokal yang memang kosong kembali terisi demo setelah refresh.
4. **Shift-click**: anchor rentang tetap pada klik non-Shift terakhir. Fallback pemilihan rentang tidak lagi membatalkan pilihan yang sudah ada.
5. **Migrasi database**: `database/migration_date_fields.sql` tersedia dan aman dijalankan berulang kali. API juga menjalankan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` saat membaca/menyimpan data.

## Catatan keamanan penting

API masih belum memiliki autentikasi/otorisasi pengguna di server. CORS hanya membatasi browser, bukan pemanggil API langsung. Karena aplikasi saat ini tidak memakai alur login, menambahkan token autentikasi secara sepihak akan memutus operasi sinkronisasi atau memerlukan alur kredensial baru. Sebelum deployment publik, pasang autentikasi/otorisasi di server atau lapisan hosting untuk seluruh operasi baca/tulis, khususnya `save`, `delete`, `deleteActors`, dan `clearDatabase`. Jangan menaruh rahasia server di variabel `VITE_*` atau source frontend.

## Validasi

- `node --check api/movies.js` berhasil.
- Build Vite/TypeScript belum dapat dikonfirmasi karena `npm ci --ignore-scripts` melewati batas waktu di lingkungan ini. Jalankan `npm ci` lalu `npm run lint` dan `npm run build` sebelum deploy.
