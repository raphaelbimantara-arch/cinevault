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
    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk Aktor
CREATE TABLE IF NOT EXISTS actors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dob DATE,
    alias VARCHAR(255),
    favorite BOOLEAN DEFAULT FALSE,
    reviewed BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    movie_count INTEGER DEFAULT 0
);

-- Tabel Penghubung (Siapa main di film apa)
CREATE TABLE IF NOT EXISTS actor_movie (
    movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, actor_id)
);