-- Run this ONCE in the Neon/PostgreSQL SQL Editor to clear current actor dates of birth.
-- It does not delete actors or alter any other actor fields.
UPDATE actors SET dob = NULL WHERE dob IS NOT NULL;
