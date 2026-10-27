# CineVault — Import Excel

## Perubahan
- Menu CSV Tools kini menerima `.xlsx` dan `.xls`, selain `.csv`.
- Excel dibaca dari sheet pertama.
- Kolom `title` atau `judul` dipakai sebagai kunci pencocokan judul film (tidak peka huruf besar/kecil dan spasi berlebih).
- Judul yang sudah ada diperbarui dan ID CineVault yang lama dipertahankan.
- Judul yang belum ada ditambahkan.
- Film yang tidak tercantum di file impor tidak dihapus.
- Untuk Excel, mode `Replace All` dinonaktifkan agar tidak mengganti seluruh katalog.

## Cara menjalankan
1. Ekstrak ZIP ini ke folder proyek.
2. Buka terminal pada folder proyek.
3. Jalankan `npm install`.
4. Siapkan variabel lingkungan database sesuai `.env.example` (jangan bagikan `.env` yang berisi rahasia).
5. Jalankan `npm run dev` untuk pengujian lokal.

Gunakan file Excel dengan baris pertama sebagai header dan setidaknya satu kolom judul, misalnya `title` atau `judul`. Kolom lain yang dikenali antara lain `genre`, `studio`, `year`, `minutes`, `size`, `resolution`, `posterUrl`/`poster`, `backdropUrl`, `actors`/`cast`, `addedDate`, `favorite`, `reviewed`, dan `uncensored`.

Catatan: jika judul yang sama muncul lebih dari sekali di katalog, pencocokan menggunakan entri pertama dengan judul tersebut.
