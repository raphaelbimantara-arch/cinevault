-- Tabel Utama untuk Film
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    year INTEGER,
    genre VARCHAR(255),
    studio VARCHAR(255),
    minutes INTEGER,
    size VARCHAR(50),
    size_bytes BIGINT,
    resolution VARCHAR(50),
    poster_url TEXT,
    backdrop_url TEXT,
    favorite BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    uncensored BOOLEAN DEFAULT FALSE,
    censored TEXT NOT NULL DEFAULT '',
    added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actors JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Upgrade existing installations that were created before movie actor credits were stored.
ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS censored TEXT NOT NULL DEFAULT '';

-- Tabel untuk Aktor
CREATE TABLE IF NOT EXISTS actors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dob DATE,
    alias VARCHAR(255),
    favorite BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    movie_count INTEGER DEFAULT 0,
    added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE actors ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Tabel Penghubung (Siapa main di film apa)
CREATE TABLE IF NOT EXISTS actor_movie (
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, actor_id)
);

-- Durable actor-deletion tombstones prevent stale offline clients from restoring deleted names.
CREATE TABLE IF NOT EXISTS deleted_actor_names (
    name_key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
