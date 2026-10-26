/* Adapter locale temporaneo: in futuro può essere sostituito da un backend mantenendo la stessa UI. */
const DB_NAME = "portfolio-studio-local-attachments";
const STORE = "files";
export const MAX_LOCAL_ATTACHMENT_SIZE = 5 * 1024 * 1024;
export function validateLocalAttachment(file) {
  if (!file) throw new Error("Seleziona un'immagine o un video.");
  if (!(file.type.startsWith("image/") || file.type.startsWith("video/"))) throw new Error("Sono consentiti soltanto immagini e video.");
  if (file.size > MAX_LOCAL_ATTACHMENT_SIZE) throw new Error("Il limite locale è 5 MB per file.");
}
function openDb() { return new Promise((resolve, reject) => { const request = indexedDB.open(DB_NAME, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error || new Error("Impossibile aprire l'archivio locale.")); }); }
export async function saveLocalAttachment(file, chatId, senderUid) {
  validateLocalAttachment(file);
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; const db = await openDb();
  await new Promise((resolve, reject) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put({ id, blob: file, name: file.name, size: file.size, type: file.type, chatId, senderUid, savedAt: Date.now() }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error || new Error("Salvataggio locale non riuscito.")); tx.onabort = () => reject(tx.error || new Error("Salvataggio locale interrotto.")); }); db.close();
  return { id, name: file.name, size: file.size, type: file.type, storage: "local-only" };
}
export async function getLocalAttachmentUrl(id) {
  const db = await openDb(); const item = await new Promise((resolve, reject) => { const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); db.close();
  if (!item?.blob) throw new Error("Questo file è disponibile solo sul dispositivo che lo ha allegato. Per condividerlo tra dispositivi servirà il backend.");
  return { url: URL.createObjectURL(item.blob), type: item.type || "", name: item.name || "Allegato" };
}
export async function openLocalAttachment(id) { return getLocalAttachmentUrl(id); }
