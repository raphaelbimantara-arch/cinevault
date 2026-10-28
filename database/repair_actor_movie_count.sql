-- Run once on an existing PostgreSQL deployment if its schema predates actor credits.
-- This is non-destructive: existing movies and actor profiles are retained.
ALTER TABLE movies ADD COLUMN IF NOT EXISTS actors JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS movie_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE actors ADD COLUMN IF NOT EXISTS debut_movie_title TEXT;

UPDATE actors AS a
SET movie_count = COALESCE((
  SELECT COUNT(DISTINCT m.id)::int
  FROM movies AS m
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN jsonb_typeof(m.actors) = 'array' THEN m.actors ELSE '[]'::jsonb END
  ) AS credit(actor_name)
  WHERE lower(trim(credit.actor_name)) = lower(trim(a.name))
    AND trim(credit.actor_name) <> ''
), 0);
