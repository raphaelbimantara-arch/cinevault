-- Run ONCE in the Neon/PostgreSQL SQL Editor to clear existing actor dates of birth.
-- This does not delete actors or modify any other fields.
UPDATE actors SET dob = NULL WHERE dob IS NOT NULL;
