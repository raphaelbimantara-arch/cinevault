# Actor Date of Birth Change

This update makes the Date of Birth field blank by default for new actors and stops CineVault from generating sample DOBs for known or newly added actors. Users can still enter a DOB manually; the existing `saveActors` API persists that value.

## Clear DOB values already in the shared database

The code cannot directly change the hosted Neon database until the API is deployed and the migration is run. Open the Neon SQL Editor for the database used by CineVault, run the contents of `database/clear_actor_dobs_once.sql` exactly once, then deploy this project. The query only sets `actors.dob` to `NULL`; it does not delete actors or other data.

The browser also performs a one-time local migration that clears previously stored actor DOB values in localStorage. After that migration, DOBs manually entered by the user are retained.
