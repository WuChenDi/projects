/**
 * Generic IndexedDB key-value store adapter.
 */
export interface IDBStore<T> {
  get(key: string): Promise<T | null>
  set(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  removeBatch(keys: string[]): Promise<void>
  list(): Promise<string[]>
  getAll(): Promise<T[]>
  clear(): Promise<void>
}

export function createIDBStore<T = ArrayBuffer>(
  dbName: string,
  storeName = 'blobs',
  version = 1,
): IDBStore<T> {
  let dbPromise: Promise<IDBDatabase> | null = null

  function openDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version)
        request.onerror = () => {
          dbPromise = null
          reject(request.error)
        }
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName)
          }
        }
      })
    }
    return dbPromise
  }

  function withTransaction<R>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest | void,
  ): Promise<R> {
    return openDB().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, mode)
          tx.onerror = () => reject(tx.error)
          tx.onabort = () => reject(tx.error)

          const req = fn(tx.objectStore(storeName))
          if (req) {
            req.onsuccess = () => resolve(req.result ?? null)
            req.onerror = () => reject(req.error)
          } else {
            tx.oncomplete = () => resolve(undefined as R)
          }
        }),
    )
  }

  return {
    get: (key) =>
      withTransaction<T | null>('readonly', (store) => store.get(key)),

    set: (key, value) =>
      withTransaction('readwrite', (store) => {
        store.put(value, key)
      }),

    remove: (key) =>
      withTransaction('readwrite', (store) => {
        store.delete(key)
      }),

    removeBatch: (keys) => {
      if (keys.length === 0) return Promise.resolve()
      return withTransaction('readwrite', (store) => {
        for (const key of keys) store.delete(key)
      })
    },

    list: () =>
      withTransaction<string[]>('readonly', (store) => store.getAllKeys() as IDBRequest<string[]>),

    getAll: () =>
      withTransaction<T[]>('readonly', (store) => store.getAll()),

    clear: () =>
      withTransaction('readwrite', (store) => {
        store.clear()
      }),
  }
}

export function deleteIDBDatabase(dbName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(dbName)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
