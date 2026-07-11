import { createIDBStore } from '@cdlab/utils'

// IndexedDB-backed blob pool for editor media (local uploads + history audio).
// Keyed by MediaAsset.id; FEAT-027 autosave restores tracks from these blobs.
export const mediaPool = createIDBStore('bytts-editor-media')
