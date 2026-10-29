CineVault v11 - Single Actor Directory Source

- Unified Add Movie actor suggestions and Movie Detail actor editing with the same canonical actor list used by the Actor directory.
- Removed legacy KNOWN_ACTORS, master actor list, and alias-list merging from actor dropdowns to prevent stale names from reappearing.
- Actor names with a persisted deletion tombstone are excluded from the canonical suggestions.

Deployment note: this change is in the source ZIP. Deploy/rebuild the app to apply it. It cannot delete data from an already-running external deployment until that deployment is updated.
