-- CineVault migration: persist Date Added and Date Modified for films and actors.
-- Safe to run repeatedly on PostgreSQL / Neon.

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS added_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE actors
  ADD COLUMN IF NOT EXISTS modified_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill legacy rows so Date Modified has a sensible initial value.
UPDATE movies
SET modified_date = COALESCE(modified_date, added_date, CURRENT_TIMESTAMP)
WHERE modified_date IS NULL;
UPDATE actors
SET modified_date = COALESCE(modified_date, added_date, CURRENT_TIMESTAMP)
WHERE modified_date IS NULL;
