import pg from 'pg';
const { Pool } = pg;

// Membuat "kolam" koneksi ke database Neon menggunakan kunci rahasia (DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Diperlukan untuk koneksi aman ke Neon/Cloud
  }
});

// Fungsi untuk mengetes apakah kunci kita berfungsi
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Gagal terhubung ke database:', err.stack);
  }
  console.log('Berhasil terhubung ke database Neon!');
  release();
});

export default pool;