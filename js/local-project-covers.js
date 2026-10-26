/* Copertine dei progetti in IndexedDB: solo browser/dispositivo corrente, nessun Firebase Storage. */
const DB_NAME = "portfolio-studio-local-project-covers";
const STORE = "covers";
export const LOCAL_COVER_PREFIX = "local-cover:";
function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("Questo browser non supporta il salvataggio locale delle immagini."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossibile aprire l'archivio locale delle copertine."));
  });
}
export async function saveLocalProjectCover(file) {
  if (!file || !file.type?.startsWith("image/")) throw new Error("Seleziona un file immagine valido.");
  if (file.size > 8 * 1024 * 1024) throw new Error("L'immagine deve pesare al massimo 8 MB.");
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, blob: file, name: file.name, type: file.type, savedAt: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("Salvataggio locale della copertina non riuscito."));
    tx.onabort = () => reject(tx.error || new Error("Salvataggio locale della copertina interrotto."));
  });
  db.close();
  return `${LOCAL_COVER_PREFIX}${id}`;
}
export async function getLocalProjectCoverUrl(reference) {
  if (!String(reference || "").startsWith(LOCAL_COVER_PREFIX)) return reference || "";
  const id = String(reference).slice(LOCAL_COVER_PREFIX.length);
  const db = await openDb();
  const item = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossibile leggere la copertina locale."));
  });
  db.close();
  if (!item?.blob) throw new Error("Copertina locale non trovata in questo browser. Ricarica l'immagine dal CMS su questo dispositivo.");
  return URL.createObjectURL(item.blob);
}
