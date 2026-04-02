const DB_NAME = 'dropply-retrieve-data'
const STORE_NAME = 'text-contents'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => {
        dbPromise = null
        reject(request.error)
      }
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }
  return dbPromise
}

export async function storeTextContent(
  key: string,
  content: string,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
    tx.objectStore(STORE_NAME).put(content, key)
  })
}

export async function getTextContent(
  key: string,
): Promise<string | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  return new Promise((resolve, reject) => {
    const request = store.get(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result ?? null)
  })
}

export async function removeTextContents(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
    const store = tx.objectStore(STORE_NAME)
    keys.forEach((key) => store.delete(key))
  })
}

export async function clearTextContents(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
    tx.objectStore(STORE_NAME).clear()
  })
}
