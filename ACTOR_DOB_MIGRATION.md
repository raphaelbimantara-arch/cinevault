# Actor Date of Birth (DoB) Fix

This revision makes actor DOB blank by default. It removes hard-coded sample DOBs and the generated DOB fallback. New actors created through movie uploads, manual entry, or other app flows start with an empty DOB.

## One-time database cleanup (required)

Open the Neon/PostgreSQL SQL Editor for the database used by CineVault and run `database/clear_actor_dobs_once.sql` once:

```sql
UPDATE actors SET dob = NULL WHERE dob IS NOT NULL;
```

This clears only existing actor DOB values. It does not delete actors or alter their other fields. Deploy the updated API and frontend after running the query.

## Persistence rules

- Refreshing or loading the shared catalog does not generate DOBs.
- Adding a movie/actor or syncing a full actor snapshot cannot overwrite an existing saved DOB.
- A DOB can be changed only by editing an actor profile and saving it; that deliberate save uses `updateDob: true`.
- Full actor sync no longer truncates the actors table, so it cannot accidentally erase actor records or their saved DOBs.
- The browser clears legacy local DOBs once, then preserves later manually saved values.

