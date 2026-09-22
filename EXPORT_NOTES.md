# Public export

This export preserves all tracked runtime files and the modelling/review sources from
the current three-scene project. The original Site checkout is untouched.
Internal hosting configuration, site operations state and the conversation authorization
excerpt are omitted. Historical milestone statuses and evidence remain; chat excerpts
in their notes are replaced by a factual historical-review notice.

The initial public Git history starts here and does not contain the original service's
repository metadata. Original assets are retained as regular files, including .blend,
.glb, map extracts and offline renders. No Git LFS service is needed for this snapshot.
The largest individual file is below GitHub's normal 100 MiB file limit.

Independent scene branches share this main snapshot as their parent, then remove
unrelated runtime entries and redirect their chosen entry to dist/index.html. Shared
asset-authoring sources remain where used. They are independently runnable working
trees, not unrelated copies of Git history.
