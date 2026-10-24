import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importCSV() {
  const csvFilePath = path.join(process.cwd(), 'database', 'movies_clean.csv'); // Baca yang bersih
  console.log("Membaca file:", csvFilePath);

  const fileContent = fs.readFileSync(csvFilePath, 'utf8');

  // Baca menggunakan PapaParse (sekarang harusnya lancar)
  const results = Papa.parse(fileContent, {
    header: false,
    skipEmptyLines: true,
  });

  console.log(`Berhasil membaca ${results.data.length} baris.`);

  let count = 0;

  for (const record of results.data) {
    const title = record[0]; // Kolom pertama adalah judul
    const year = record[1];
    const genre = record[2];

    if (!title) continue;

    let yearInt = parseInt(year);
    if (isNaN(yearInt)) yearInt = null;

    try {
      await pool.query(
        `INSERT INTO movies (title, year, genre) VALUES ($1, $2, $3)`,
        [title, yearInt, genre]
      );
      
      count++;
      if (count % 100 === 0) console.log(`Sudah masuk ${count} film...`);
    } catch (err) {
      console.error(`Gagal: ${title}`, err.message);
    }
  }

  console.log(`Selesai! Total ${count} film berhasil dimasukkan.`);
  await pool.end();
}

importCSV().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});