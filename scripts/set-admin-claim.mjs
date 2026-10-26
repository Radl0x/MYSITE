/**
 * ESEGUIRE SOLO IN UN AMBIENTE PRIVILEGIATO E FIDATO.
 * Non caricare mai service-account.json nel sito o nel repository pubblico.
 *
 * Uso:
 *   npm install firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=/percorso/service-account.json node scripts/set-admin-claim.mjs admin@dominio.it
 *
 * Prima di eseguire, creare l'utente da Firebase Console > Authentication.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Uso: node scripts/set-admin-claim.mjs admin@dominio.it");
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: "studio-83022" });
const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
console.log(`Claim admin assegnata all'utente ${user.uid}. Chiedere all'utente di effettuare nuovamente l'accesso.`);
