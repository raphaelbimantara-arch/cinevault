import pool from '../database/connection.js';

const DEFAULT_ORIGIN = 'https://cinevault-delta-lake.vercel.app';
const PREVIEW_ORIGINS = [
  'https://cinevault-mdu67avr6-raphaelbimantara-5365.vercel.app',
];

function jsonResponse(value, status, headers) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      DEFAULT_ORIGIN,
      ...PREVIEW_ORIGINS,
      'http://localhost:5173',
      'https://localhost',
      'capacitor://localhost',
      ...(process.env.CINEVAULT_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    ];
    const headers = new Headers({ 'Cache-Control': 'no-store' });

    if (origin && !allowedOrigins.includes(origin)) {
      return jsonResponse({ error: 'Origin is not allowed.' }, 403, headers);
    }
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      headers.set('Allow', 'POST, OPTIONS');
      return jsonResponse({ error: 'Method not allowed.' }, 405, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON.' }, 400, headers);
    }

    // --- BAGIAN YANG DIUBAH: Ganti Pengecekan Gsheet ke Database Neon ---
    
    // 1. Cek apakah koneksi database sudah disetel di Vercel
    if (!process.env.DATABASE_URL) {
      console.error('Database URL is missing.');
      return jsonResponse({ error: 'Database is not configured on the server.' }, 503, headers);
    }

    // 2. Tetap gunakan token rahasia untuk keamanan
    const sharedSecret = process.env.CINEVAULT_SHARED_SECRET;
    if (typeof body.token !== 'string' || body.token !== sharedSecret) {
      return jsonResponse({ error: 'Access key is incorrect.' }, 401, headers);
    }

    const supportedActions = ['load', 'save', 'loadActors', 'saveActor', 'deleteActors', 'saveActors'];
    if (!supportedActions.includes(body.action)) {
      return jsonResponse({ error: 'Unsupported catalog action.' }, 400, headers);
    }

    try {
      // --- LOGIKA BARU UNTUK POSTGRESQL (NEON) ---

      if (body.action === 'load') {
        const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
        return jsonResponse({ movies: result.rows }, 200, headers);
      }

      if (body.action === 'loadActors') {
        const result = await pool.query('SELECT * FROM actors ORDER BY name ASC');
        return jsonResponse({ actors: result.rows }, 200, headers);
      }

      // (Catatan: Fungsi save, saveActor, dll. sengaja dibiarkan kosong dulu
      // agar aplikasi tidak crash. Besok kita isi pakai AI)
      if (['save', 'saveActor', 'deleteActors', 'saveActors'].includes(body.action)) {
        return jsonResponse({ error: 'Fitur simpan belum diaktifkan di PostgreSQL.' }, 501, headers);
      }

      return jsonResponse({ error: 'Aksi tidak dikenal.' }, 400, headers);

    } catch (error) {
      console.error('Database request failed:', error);
      return jsonResponse({ error: 'Gagal menghubungi database.' }, 502, headers);
    }
  },
};