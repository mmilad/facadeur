# Local project JSON API

The editor runs on localhost:3001. Its Next routes load and save project JSON; no separate server or Yjs runtime is required. ProjectController owns live editing state and Undo/Redo uses snapshots.

| Method | Path                                     | Result                                                                |
| ------ | ---------------------------------------- | --------------------------------------------------------------------- |
| GET    | /api/projects/default                    | Design, documents, source filenames, hashes and recovered unsaved IDs |
| POST   | /api/projects/default/documents/:id/save | Explicitly write a document JSON snapshot                             |

Save accepts `{ document, source, expectedHash }`. Use the source/hash from GET; a new document uses its chosen JSON filename and a null hash. The document ID must match the URL. Validation includes the current catalog and design schema. Saves are serialized and files are replaced atomically. A source changed externally returns 409. Saving a snapshot only clears the dirty baseline for that exact snapshot, preserving later edits.

Editing stays in the browser until Save. Export JSON remains a browser download. Code generation reads the exported files, so save before generating components. There is currently no cross-tab collaboration, remote command API, or automatic persistence of new edits.

During the Yjs removal, 13 unsaved documents (including new-atom) were recovered into ignored `.facadeur/editor-recovery.json`. GET overlays these drafts onto unchanged source files and marks them unsaved. Save removes only the successfully exported draft from recovery. `.facadeur/yjs-retirement-snapshot.json` preserves the full prior catalog; original durable Yjs data is untouched. A conflicting source is reported instead of silently overriding either version.

Set FACADEUR_PROJECT_DIR to load a different project directory. The default is examples/. The former server and sync adapter remain outside the editor runtime as reference code; see [the legacy API](project-api-yjs-legacy.md).
