# Firebase setup e regole

## Setup amministratore

1. Firebase Console → Authentication → Sign-in method → abilita Email/Password.
2. Authentication → Users → Add user: crea il tuo utente admin.
3. Copia l'UID utente.
4. Firestore Database → Data → Start collection `admins`.
5. Document ID: l'UID copiato.
6. Campo `active`, tipo **boolean**, valore `true`.
7. Firestore Database → Rules: incolla `firestore.rules` e pubblica.
8. Accedi da `admin.html`.

Non aggiungere una password al documento admin e non memorizzare password nel codice client.

## Regole complete

Le regole complete e aggiornate sono nel file `../firestore.rules` alla radice del pacchetto. Copia tutto il contenuto del file nell'editor Firestore Rules.

## Principi di sicurezza

- L'utente deve essere autenticato.
- Il ruolo admin è assegnato da un operatore del progetto tramite documento protetto.
- I visitatori possono soltanto creare richieste con campi ammessi e valori convalidati.
- Le richieste sono private e accessibili agli admin.
- I record pubblici sono leggibili soltanto se visibili.
- Tutte le altre operazioni sono negate per default.


## Live chat

Per consentire ai visitatori di aprire una chat, abilita anche **Authentication → Sign-in method → Anonymous**. La chat usa UID anonimi per isolare le conversazioni; l’area CMS continua a richiedere un account Email/Password autorizzato in `admins/{UID}`. Pubblica le regole aggiornate dal file `firestore.rules` prima di testare.


## Allegati nella live chat

La chat supporta immagini, PDF, TXT, DOC, DOCX e ZIP fino a 10 MB. Per abilitarli:

1. Firebase Console → **Storage** → configura/attiva Firebase Storage per il progetto.
2. Firebase Console → **Storage → Rules**: pubblica il contenuto del file `../storage.rules`. Le regole consentono l'accesso al partecipante della chat e agli admin con `admins/{UID}` e `active: true`.
3. Pubblica anche il file `../firestore.rules` aggiornato: la validazione dei messaggi ora consente il campo opzionale `attachment`.
4. Verifica che Firebase Storage sia attivo nel progetto e che il bucket indicato in `js/firebase.js` sia quello corretto.

Gli allegati vengono caricati in Storage e il messaggio contiene il nome, il tipo, la dimensione e il collegamento al file. Non rendere pubbliche le regole di Storage.


## Allegati chat in modalità locale (senza Firebase Storage)

La versione attuale salva i file in IndexedDB nel browser locale. Limite: 5 MB per file; i file non vengono condivisi tra browser/dispositivi e non sono un backup. Pubblica `firestore.rules` aggiornato per autorizzare i metadati `storage: "local-only"`. Firebase Storage non è richiesto in questa fase. Quando verrà aggiunto il backend, sostituisci l'implementazione in `js/local-attachments.js` con l'upload backend mantenendo la stessa interfaccia (`saveLocalAttachment`, `openLocalAttachment`).
