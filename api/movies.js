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
      // ==========================================
      // 1. LOAD DATA (Movies & Actors)
      // ==========================================
      if (body.action === 'load') {
        const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
        const formattedMovies = result.rows.map(row => ({
          id: row.id.toString(),
          title: row.title || 'Untitled',
          year: row.year || 0,
          genre: row.genre || '',
          studio: row.studio || '',
          minutes: row.minutes || 0,
          size: row.size || '0 GB',
          sizeBytes: row.size_bytes || 0,
          resolution: row.resolution || '1080p',
          posterUrl: row.poster_url || '',
          backdropUrl: row.backdrop_url || '',
          actors: row.actors || [],
          favorite: row.favorite,
          reviewed: row.reviewed,
          uncensored: row.uncensored,
          addedDate: row.added_date || new Date().toISOString()
        }));
        return jsonResponse({ movies: formattedMovies }, 200, headers);
      }

      if (body.action === 'loadActors') {
        const result = await pool.query('SELECT * FROM actors ORDER BY name ASC');
        const formattedActors = result.rows.map(row => ({
          name: row.name,
          alias: row.alias || '',
          dob: row.dob ? row.dob.toISOString().split('T')[0] : '',
          photoUrl: row.photo_url || '',
          favorite: row.favorite,
          reviewed: row.reviewed,
          movieCount: row.movie_count
        }));
        return jsonResponse({ actors: formattedActors }, 200, headers);
      }

      // ==========================================
      // 2. SAVE MOVIES (UPSERT: Update or Insert)
      // ==========================================
      if (body.action === 'save') {
        if (!Array.isArray(body.movies)) {
          return jsonResponse({ error: 'Movies must be an array.' }, 400, headers);
        }

        // Loop setiap film, lalu lakukan UPSERT berdasarkan ID
        for (const m of body.movies) {
          // Pastikan ID ada (jika dari CSV baru, kita generate ID unik)
          const movieId = m.id ? String(m.id) : `csv-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          
          await pool.query(
            `INSERT INTO movies (id, title, year, genre, studio, minutes, size, size_bytes, resolution, poster_url, backdrop_url, favorite, reviewed, uncensored, added_date, actors) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             ON CONFLICT (id) DO UPDATE SET 
               title = EXCLUDED.title,
               year = EXCLUDED.year,
               genre = EXCLUDED.genre,
               studio = EXCLUDED.studio,
               minutes = EXCLUDED.minutes,
               size = EXCLUDED.size,
               size_bytes = EXCLUDED.size_bytes,
               resolution = EXCLUDED.resolution,
               poster_url = EXCLUDED.poster_url,
               backdrop_url = EXCLUDED.backdrop_url,
               favorite = EXCLUDED.favorite,
               reviewed = EXCLUDED.reviewed,
               uncensored = EXCLUDED.uncensored,
               added_date = EXCLUDED.added_date,
               actors = EXCLUDED.actors`,
            [
              movieId, m.title, m.year || null, m.genre || null, m.studio || null, 
              m.minutes || null, m.size || null, m.sizeBytes || null, m.resolution || null, 
              m.posterUrl || null, m.backdropUrl || null, m.favorite || false, 
              m.reviewed || false, m.uncensored || false, m.addedDate || null, 
              JSON.stringify(m.actors || [])
            ]
          );
        }
        return jsonResponse({ message: `${body.movies.length} movies successfully synchronized.` }, 200, headers);
      }

      // ==========================================
      // 3. SAVE ACTORS (UPSERT: Update or Insert)
      // ==========================================
      if (body.action === 'saveActor' || body.action === 'saveActors') {
        const actorsToSave = body.action === 'saveActor' ? [body.actor] : body.actors;
        if (!actorsToSave || !Array.isArray(actorsToSave)) {
          return jsonResponse({ error: 'Invalid actor data.' }, 400, headers);
        }

        for (const a of actorsToSave) {
          await pool.query(
            `INSERT INTO actors (name, alias, dob, photo_url, favorite, reviewed, movie_count) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (name) DO UPDATE 
             SET alias = EXCLUDED.alias, dob = EXCLUDED.dob, photo_url = EXCLUDED.photo_url, 
                 favorite = EXCLUDED.favorite, reviewed = EXCLUDED.reviewed, movie_count = EXCLUDED.movie_count`,
            [a.name, a.alias || null, a.dob || null, a.photoUrl || null, a.favorite || false, a.reviewed || false, a.movieCount || 0]
          );
        }
        return jsonResponse({ message: 'Actors successfully saved.' }, 200, headers);
      }

      // ==========================================
      // 4. DELETE ACTORS
      // ==========================================
      if (body.action === 'deleteActors') {
        if (!Array.isArray(body.names)) {
          return jsonResponse({ error: 'Names must be an array.' }, 400, headers);
        }
        for (const name of body.names) {
          await pool.query('DELETE FROM actors WHERE name = $1', [name]);
        }
        return jsonResponse({ message: 'Actors successfully deleted.' }, 200, headers);
      }

      return jsonResponse({ error: 'Unknown action.' }, 400, headers);

    } catch (error) {
      console.error('Database error:', error);
      return jsonResponse({ error: 'Failed to connect to database: ' + error.message }, 502, headers);
    }
  },
};