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

    const sharedSecret = process.env.CINEVAULT_SHARED_SECRET;
    if (typeof body.token !== 'string' || body.token !== sharedSecret) {
      return jsonResponse({ error: 'Access key is incorrect.' }, 401, headers);
    }

    const supportedActions = ['load', 'save', 'loadActors', 'saveActor', 'deleteActors', 'saveActors'];
    if (!supportedActions.includes(body.action)) {
      return jsonResponse({ error: 'Unsupported catalog action.' }, 400, headers);
    }

    try {
      if (body.action === 'load') {
        // Ambil semua film dari Neon
        const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
        
        // Format ulang agar sesuai dengan yang diharapkan aplikasi React kamu
        const formattedMovies = result.rows.map(row => ({
          id: row.id,
          title: row.title || 'Tanpa Judul',
          year: row.year || '',
          genre: row.genre || '',
          studio: row.studio || '',
          minutes: 0,
          size: '0 GB',
          sizeBytes: 0,
          resolution: '720p',
          posterUrl: '',
          backdropUrl: '',
          actors: [],
          favorite: false,
          reviewed: false,
          uncensored: false,
          addedDate: new Date().toISOString()
        }));

        return jsonResponse({ movies: formattedMovies }, 200, headers);
      }

      if (body.action === 'loadActors') {
        return jsonResponse({ actors: [] }, 200, headers);
      }

      // Fitur simpan sementara dimatikan dulu
      if (['save', 'saveActor', 'deleteActors', 'saveActors'].includes(body.action)) {
        return jsonResponse({ error: 'Fitur simpan belum aktif.' }, 501, headers);
      }

      return jsonResponse({ error: 'Aksi tidak dikenal.' }, 400, headers);

    } catch (error) {
      console.error('Database error:', error);
      return jsonResponse({ error: 'Gagal menghubungi database.' }, 502, headers);
    }
  },
};