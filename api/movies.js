import pool from '../database/connection.js';

const DEFAULT_ORIGIN = 'https://cinevault-delta-lake.vercel.app';
const PREVIEW_ORIGINS = ['https://cinevault-mdu67avr6-raphaelbimantara-5365.vercel.app'];

function jsonResponse(value, status, headers) {
  return new Response(JSON.stringify(value), { status, headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } });
}

async function refreshActorMovieCounts(db) {
  // movie_count is derived from the current movie catalog, not trusted from stale client profiles.
  await db.query(`
    UPDATE actors AS a
    SET movie_count = COALESCE((
      SELECT COUNT(DISTINCT m.id)::int
      FROM movies AS m
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(m.actors) = 'array' THEN m.actors ELSE '[]'::jsonb END
      ) AS credit(actor_name)
      WHERE lower(trim(credit.actor_name)) = lower(trim(a.name))
        AND trim(credit.actor_name) <> ''
    ), 0)
  `);
}

export default {
  async fetch(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [DEFAULT_ORIGIN, ...PREVIEW_ORIGINS, 'http://localhost:5173', 'https://localhost', 'capacitor://localhost', ...(process.env.CINEVAULT_ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean)];
    const headers = new Headers({ 'Cache-Control': 'no-store' });

    if (origin && !allowedOrigins.includes(origin)) return jsonResponse({ error: 'Origin is not allowed.' }, 403, headers);
    if (origin) { headers.set('Access-Control-Allow-Origin', origin); headers.set('Vary', 'Origin'); }
    headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS'); headers.set('Access-Control-Allow-Headers', 'Content-Type'); headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, headers);

    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON.' }, 400, headers); }

    const supportedActions = ['load', 'save', 'delete', 'loadActors', 'saveActor', 'deleteActors', 'saveActors', 'clearDatabase'];
    if (!supportedActions.includes(body.action)) return jsonResponse({ error: 'Unsupported action.' }, 400, headers);

    try {
      // Tombstones make actor deletion durable across devices and prevent stale offline snapshots from resurrecting names.
      await pool.query(`CREATE TABLE IF NOT EXISTS deleted_actor_names (name_key TEXT PRIMARY KEY, name TEXT NOT NULL, deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
      if (body.action === 'load') {
        await pool.query("ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors JSONB NOT NULL DEFAULT '[]'::jsonb");
        await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query("ALTER TABLE movies ADD COLUMN IF NOT EXISTS censored TEXT NOT NULL DEFAULT ''");
        const deletedResult = await pool.query('SELECT name_key FROM deleted_actor_names');
        const deletedNames = new Set(deletedResult.rows.map(row => String(row.name_key).toLowerCase()));
        const result = await pool.query('SELECT * FROM movies ORDER BY id DESC');
        const formatted = result.rows.map(row => ({
          id: row.id.toString(), title: row.title || 'Untitled', year: Number(row.year) || 0,
          genre: row.genre || '', studio: row.studio || '', minutes: Number(row.minutes) || 0,
          size: row.size || '0 GB', sizeBytes: Math.round(Number(row.size_bytes)) || 0,
          resolution: row.resolution || '1080p', posterUrl: row.poster_url || '', backdropUrl: row.backdrop_url || '',
          actors: (Array.isArray(row.actors) ? row.actors : []).filter((name) => !deletedNames.has(String(name).trim().toLowerCase())), favorite: row.favorite, reviewed: row.reviewed, uncensored: row.uncensored, censored: row.censored || (row.uncensored ? 'Uncensored' : ''),
          addedDate: row.added_date || new Date().toISOString(), modifiedDate: row.modified_date || row.added_date || new Date().toISOString()
        }));
        return jsonResponse({ movies: formatted }, 200, headers);
      }

      if (body.action === 'loadActors') {
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS debut_movie_title TEXT');
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await refreshActorMovieCounts(pool);
        const result = await pool.query('SELECT * FROM actors ORDER BY name ASC');
        const formatted = result.rows.map(row => ({
          name: row.name, alias: row.alias || '', dob: row.dob ? row.dob.toISOString().split('T')[0] : '',
          photoUrl: row.photo_url || '', debutMovieTitle: row.debut_movie_title || '', favorite: row.favorite, reviewed: row.reviewed, movieCount: row.movie_count, dateAdded: row.added_date || '', dateModified: row.modified_date || row.added_date || ''
        }));
        const deletedResult = await pool.query('SELECT name FROM deleted_actor_names ORDER BY name ASC');
        return jsonResponse({ actors: formatted, deletedActorNames: deletedResult.rows.map(row => row.name) }, 200, headers);
      }

      if (body.action === 'save') {
        await pool.query("ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors JSONB NOT NULL DEFAULT '[]'::jsonb");
        await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query("ALTER TABLE movies ADD COLUMN IF NOT EXISTS censored TEXT NOT NULL DEFAULT ''");
        if (!Array.isArray(body.movies)) return jsonResponse({ error: 'Movies must be array.' }, 400, headers);
        const deletedResult = await pool.query('SELECT name_key FROM deleted_actor_names');
        const deletedNames = new Set(deletedResult.rows.map(row => String(row.name_key).toLowerCase()));

        // Stream server-side progress as newline-delimited JSON so the client reports
        // actual database work rather than upload progress alone.
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const emit = (value) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
            (async () => {
              const client = await pool.connect();
              try {
                const total = body.movies.length;
                emit({ type: 'progress', phase: 'Preparing database transaction', percent: 2, completed: 0, total });
                await client.query('BEGIN');
                await client.query('TRUNCATE TABLE movies RESTART IDENTITY CASCADE');
                const usedIds = new Set();
                for (let i = 0; i < total; i++) {
                  const m = body.movies[i];
                  const candidateId = String(m.id ?? '').trim();
                  const numericId = /^\d+$/.test(candidateId) && Number(candidateId) > 0 && Number.isSafeInteger(Number(candidateId)) && !usedIds.has(Number(candidateId))
                    ? Number(candidateId) : null;
                  if (numericId !== null) usedIds.add(numericId);
                  const safeYear = parseInt(String(m.year ?? '').replace(/[^0-9]/g, ''), 10) || 0;
                  const safeMinutes = parseInt(String(m.minutes ?? '').replace(/[^0-9]/g, ''), 10) || 0;
                  const safeSizeBytes = Math.round(Number(String(m.sizeBytes ?? '').replace(/[^0-9]/g, ''))) || 0;
                  const values = [m.title || 'Untitled', safeYear, m.genre || null, m.studio || null, safeMinutes, m.size || null, safeSizeBytes, m.resolution || null, m.posterUrl || null, m.backdropUrl || null, Boolean(m.favorite), Boolean(m.reviewed), Boolean(m.uncensored || m.censored === 'Uncensored'), m.censored || (m.uncensored ? 'Uncensored' : ''), m.addedDate || new Date().toISOString(), m.modifiedDate || m.addedDate || new Date().toISOString(), JSON.stringify((Array.isArray(m.actors) ? m.actors : []).filter((name) => !deletedNames.has(String(name).trim().toLowerCase())))];
                  if (numericId !== null) {
                    await client.query(
                      `INSERT INTO movies (id, title, year, genre, studio, minutes, size, size_bytes, resolution, poster_url, backdrop_url, favorite, reviewed, uncensored, censored, added_date, modified_date, actors) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                      [numericId, ...values]
                    );
                  } else {
                    await client.query(
                      `INSERT INTO movies (title, year, genre, studio, minutes, size, size_bytes, resolution, poster_url, backdrop_url, favorite, reviewed, uncensored, censored, added_date, modified_date, actors) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`, values
                    );
                  }
                  // Reserve the final portion for sequence maintenance and actor-count refresh.
                  const percent = total ? Math.min(88, 3 + Math.floor(((i + 1) / total) * 85)) : 88;
                  emit({ type: 'progress', phase: 'Saving movies to database', percent, completed: i + 1, total });
                }
                emit({ type: 'progress', phase: 'Updating database sequence', percent: 90, completed: total, total });
                const sequenceResult = await client.query("SELECT pg_get_serial_sequence('movies', 'id') AS sequence_name");
                const sequenceName = sequenceResult.rows[0]?.sequence_name;
                if (sequenceName) {
                  const maxIdResult = await client.query("SELECT MAX(NULLIF(id::text, '')::bigint) AS max_id, COUNT(*)::int AS row_count FROM movies");
                  const maxId = Number(maxIdResult.rows[0]?.max_id) || 1;
                  const hasRows = Number(maxIdResult.rows[0]?.row_count) > 0;
                  await client.query('SELECT setval($1::regclass, $2::bigint, $3::boolean)', [sequenceName, maxId, hasRows]);
                }
                emit({ type: 'progress', phase: 'Synchronizing actor movie counts', percent: 94, completed: total, total });
                await refreshActorMovieCounts(client);
                emit({ type: 'progress', phase: 'Committing database transaction', percent: 97, completed: total, total });
                await client.query('COMMIT');
                emit({ type: 'complete', message: 'Movie database replaced successfully.', count: total });
              } catch (error) {
                try { await client.query('ROLLBACK'); } catch {}
                emit({ type: 'error', error: 'Database failed: ' + error.message });
              } finally {
                client.release();
                controller.close();
              }
            })().catch((error) => {
              emit({ type: 'error', error: 'Database failed: ' + error.message });
              controller.close();
            });
          }
        });
        headers.set('Content-Type', 'application/x-ndjson; charset=utf-8');
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(stream, { status: 200, headers });
      }

      if (body.action === 'clearDatabase') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('TRUNCATE TABLE movies, actors RESTART IDENTITY CASCADE');
          await client.query('COMMIT');
          return jsonResponse({ message: 'All CineVault database records have been deleted.' }, 200, headers);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      // FITUR HAPUS FILM BARU
      if (body.action === 'delete') {
        if (!body.movieId) return jsonResponse({ error: 'Movie ID is required.' }, 400, headers);
        await pool.query('DELETE FROM movies WHERE id = $1', [String(body.movieId)]);
        return jsonResponse({ message: `Movie deleted.` }, 200, headers);
      }

      if (body.action === 'saveActor' || body.action === 'saveActors') {
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS debut_movie_title TEXT');
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        await pool.query('ALTER TABLE actors ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
        const actorsToSave = body.action === 'saveActor' ? [body.actor] : body.actors;
        if (!Array.isArray(actorsToSave)) return jsonResponse({ error: 'Invalid actor data.' }, 400, headers);
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Actor sync is deliberately non-destructive. Imports and full snapshots must not
          // erase existing DOBs; only a deliberate single-actor edit (updateDob: true) may change it.
          for (const a of actorsToSave) {
            if (!a || !String(a.name || '').trim()) continue;
            const allowDobUpdate = body.action === 'saveActor' && body.updateDob === true;
            const actorName = a.name.trim();
            const tombstone = await client.query('SELECT 1 FROM deleted_actor_names WHERE name_key = lower(trim($1))', [actorName]);
            if (tombstone.rowCount > 0) continue;
            const updateResult = await client.query(
              `UPDATE actors SET
                 alias = $2,
                 dob = CASE WHEN $8::boolean THEN $3::date ELSE dob END,
                 photo_url = $4,
                 favorite = $5,
                 reviewed = $6,
                 debut_movie_title = $7,
                 modified_date = CURRENT_TIMESTAMP
               WHERE lower(trim(name)) = lower(trim($1))`,
              [actorName, a.alias || null, allowDobUpdate ? (a.dob || null) : null, a.photoUrl || null, Boolean(a.favorite), Boolean(a.reviewed), String(a.debutMovieTitle || '').trim() || null, allowDobUpdate]
            );
            if (updateResult.rowCount === 0) {
              await client.query(
                `INSERT INTO actors (name, alias, dob, photo_url, favorite, reviewed, movie_count, debut_movie_title, added_date, modified_date)
                 VALUES ($1, $2, $3, $4, $5, $6, 0, $7, COALESCE($8::timestamp, CURRENT_TIMESTAMP), COALESCE($9::timestamp, CURRENT_TIMESTAMP))`,
                [actorName, a.alias || null, allowDobUpdate ? (a.dob || null) : null, a.photoUrl || null, Boolean(a.favorite), Boolean(a.reviewed), String(a.debutMovieTitle || '').trim() || null, a.dateAdded || null, a.dateModified || null]
              );
            }
          }
          await refreshActorMovieCounts(client);
          await client.query('COMMIT');
          return jsonResponse({ message: 'Actors saved.', count: actorsToSave.length }, 200, headers);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      if (body.action === 'deleteActors') {
        if (!Array.isArray(body.names)) return jsonResponse({ error: 'Names must be array.' }, 400, headers);
        const names = [...new Map(body.names.map((value) => String(value || '').trim()).filter(Boolean).map((name) => [name.toLowerCase(), name])).values()];
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          for (const name of names) {
            const key = name.toLowerCase();
            await client.query(`INSERT INTO deleted_actor_names (name_key, name, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (name_key) DO UPDATE SET name = EXCLUDED.name, deleted_at = CURRENT_TIMESTAMP`, [key, name]);
            await client.query('DELETE FROM actors WHERE lower(trim(name)) = $1', [key]);
            await client.query(`UPDATE movies SET actors = COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(actors) = 'array' THEN actors ELSE '[]'::jsonb END) AS credit(value) WHERE lower(trim(value)) <> $1), '[]'::jsonb), modified_date = CURRENT_TIMESTAMP WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(actors) = 'array' THEN actors ELSE '[]'::jsonb END) AS credit(value) WHERE lower(trim(value)) = $1)`, [key]);
          }
          await refreshActorMovieCounts(client);
          await client.query('COMMIT');
          return jsonResponse({ message: 'Actors deleted from profiles and all movie credits; deletion tombstones saved.', count: names.length }, 200, headers);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }
      return jsonResponse({ error: 'Unknown action.' }, 400, headers);
    } catch (error) {
      console.error('Database error:', error);
      return jsonResponse({ error: 'Database failed: ' + error.message }, 500, headers);
    }
  },
};