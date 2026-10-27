# Panduan Sinkronisasi Database CineVault

## Perilaku baru

- **Save to Database** mengganti seluruh katalog film cloud dengan katalog film yang sedang tampil di perangkat ini. Data film lama yang tidak ada pada katalog perangkat tidak akan tertinggal di tabel `movies`.
- Profil aktor pada database juga diganti dengan snapshot profil aktor yang disimpan oleh aplikasi.
- **Refresh from Database** memuat ulang snapshot terakhir dari database cloud, termasuk ketika katalog memang kosong.
- **Delete Entire Database** menghapus seluruh data film dan profil aktor di database cloud. Aplikasi meminta konfirmasi dua tahap sebelum menjalankannya.
- Penggantian katalog dilakukan dalam transaksi database. Jika proses menyimpan film gagal, perubahan film di-rollback agar katalog sebelumnya tidak terhapus sebagian.

## Penting: deploy backend

Aplikasi frontend memanggil API pada `VITE_CATALOG_API_URL` atau URL default yang ditentukan di `src/utils/sharedCatalog.ts`. File `api/movies.js` pada proyek ini adalah kode backend. Agar tombol **Save to Database** dan **Delete Entire Database** menggunakan perilaku baru di server, deploy kode backend `api/movies.js` ke layanan yang saat ini menjalankan endpoint tersebut. Mengganti frontend saja tidak memperbarui backend yang sudah online.

Pastikan konfigurasi `DATABASE_URL` pada layanan backend tetap benar. Jangan membagikan file `.env` atau kredensial database.

## Cara memakai

1. Jalankan aplikasi dan buka **Settings → System**.
2. Pilih **Save to Database** untuk mengganti katalog cloud dengan katalog yang sedang tampil. Konfirmasi penyimpanan.
3. Di perangkat lain, pilih **Refresh from Database** untuk mengambil katalog terakhir yang tersimpan.
4. Gunakan **Delete Entire Database** hanya jika memang ingin menghapus semua film dan profil aktor dari database cloud. Tindakan ini permanen.

## Validasi yang disarankan

Sebelum menggunakan database produksi, simpan salinan/backup database. Uji dengan beberapa film: simpan katalog, refresh, pastikan jumlah dan judul film sesuai, lalu uji penghapusan hanya pada lingkungan yang aman.
