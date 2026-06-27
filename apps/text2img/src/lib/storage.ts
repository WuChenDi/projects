import { createIDBStore } from '@cdlab996/utils'

// Generated image blobs are persisted in IndexedDB keyed by result id.
// localStorage only keeps the lightweight metadata (see useImageStore).
const imageStore = createIDBStore<Blob>('text2img-images')

export { imageStore }
