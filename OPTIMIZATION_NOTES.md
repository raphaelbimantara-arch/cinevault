CineVault UI optimization changes in this package

- Movie grid renders a window of rows instead of mapping every movie card into the DOM.
- Grid poster cards use square corners and no hover zoom animation.
- The size slider is shown only in Covers mode, not Cards mode.
- List mode spans the available width, has a scrollable full-height table, and includes text-only Front Cover / Back Cover status columns (Available/Missing).
- Table headers support browser-native horizontal resizing where supported.
- Catalog localStorage persistence is debounced by 700ms.
- The Reset Demo Library footer control has been removed.

Build validation note: npm dependency installation timed out in the execution environment, so `npm run build` could not be completed here. Run `npm install` and `npm run build` in your development environment before deployment.
