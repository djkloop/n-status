const DB_NAME = "n-status"
const DB_VERSION = 1
const STORE_NAME = "upstream_cache"

type CachedData = {
  id: string
  token: string
  user: unknown
  groups: unknown
  apiRaw: unknown
  apiItems: unknown
  health: unknown
  healthError: string | null
  groupsFetchedAt: number | null
  apiFetchedAt: number | null
  healthFetchedAt: number | null
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        const req = fn(store)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
      })
  )
}

export async function loadCache(id: string): Promise<CachedData | null> {
  try {
    return await withStore("readonly", (s) => s.get(id))
  } catch {
    return null
  }
}

export async function saveCache(data: CachedData): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(data))
  } catch {}
}

export async function deleteCache(id: string): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(id))
  } catch {}
}

export async function loadAllCacheIds(): Promise<string[]> {
  try {
    return await withStore("readonly", (s) => s.getAllKeys() as IDBRequest<string[]>)
  } catch {
    return []
  }
}

export type { CachedData }
