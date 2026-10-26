import { db } from "./client.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

export const DEFAULT_SETTINGS = {
  siteName: "STUDIO.",
  heroTitle: "Il web prende un'altra forma.",
  heroDescription: "Progetto e sviluppo esperienze digitali su misura, dove codice, interazione e direzione visiva lavorano insieme.",
  aboutLead: "Da oltre quindici anni esploro il web costruendo interfacce, strumenti e progetti digitali per passione, ricerca e sperimentazione.",
  seoDescription: "Sviluppo front-end su misura: siti web, landing page, CMS, sistemi di prenotazione e web application.",
  experience: "15+ anni",
  projectCount: "1.000+ esperimenti e progetti"
};

export async function readSettings() {
  const snap = await getDoc(doc(db, "site", "settings"));
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : DEFAULT_SETTINGS;
}

export async function readPublicCollection(name) {
  const q = query(collection(db, name), where("visible", "==", true), orderBy("order", "asc"), limit(40));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function submitRequest(payload) {
  const docRef = await addDoc(collection(db, "requests"), {
    ...payload,
    status: "new",
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function readAdminCollection(name) {
  const q = query(collection(db, name), orderBy("order", "asc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveRecord(name, id, data) {
  const target = id ? doc(db, name, id) : doc(collection(db, name));
  await setDoc(target, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  return target.id;
}

export async function removeRecord(name, id) {
  await deleteDoc(doc(db, name, id));
}

export async function readRequests() {
  const q = query(collection(db, "requests"), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateRequestStatus(id, status) {
  await updateDoc(doc(db, "requests", id), { status, updatedAt: serverTimestamp() });
}
