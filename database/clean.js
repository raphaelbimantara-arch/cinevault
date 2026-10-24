import fs from 'fs';
import path from 'path';

const inputFile = path.join(process.cwd(), 'database', 'movies.csv');
const outputFile = path.join(process.cwd(), 'database', 'movies_clean.csv');

console.log("Membaca file berantakan:", inputFile);

let text = fs.readFileSync(inputFile, 'utf8');

// 1. Buang karakter aneh di awal file
if (text.charCodeAt(0) === 0xFEFF) {
  text = text.slice(1);
}

// 2. Buang semua enter (baris baru) yang nyasar di tengah data
text = text.replace(/\r?\n|\r/g, ' ');

// 3. Ubah tanda kutip ganda ("" atau ") menjadi koma (,)
// Tapi hati-hati, kita harus memastikan tidak ada koma ganda
let cleaned = text.replace(/""/g, ',').replace(/"/g, '');

// 4. Pisahkan berdasarkan koma
let parts = cleaned.split(',').map(p => p.trim());

// 5. Susun ulang menjadi format CSV yang rapi: Judul, Tahun, Genre, Kode
let result = '';
let i = 0;
let count = 0;

while (i < parts.length) {
  // Berdasarkan struktur file asli kamu: 
  // index 0 = Kode, index 1 = Kode, index 2 = Genre, index 3 = Judul, index 4 = Tahun
  let code = parts[i];
  let genre = parts[i + 2];
  let title = parts[i + 3];
  let year = parts[i + 4];

  // Cek apakah ini data yang valid (judul tidak kosong dan bukan link)
  if (title && title !== '' && !title.includes('http')) {
    // Bungkus dengan tanda kutip agar aman
    result += `"${title}","${year}","${genre}","${code}"\n`;
    count++;
  }
  
  i += 6; // Maju 6 langkah ke film berikutnya
}

// Simpan ke file baru
fs.writeFileSync(outputFile, result, 'utf8');

console.log(`Selesai membersihkan! ${count} film disimpan di movies_clean.csv`);