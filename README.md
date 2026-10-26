# Studio — Portfolio Front-end & Firebase

Portfolio web cinematico creato da zero con HTML5, CSS3, JavaScript ES modules, Three.js e Firebase Authentication/Firestore. Non richiede bundler né installazione di pacchetti npm per il sito statico.

## Contenuto

- `index.html`: sito pubblico responsive, scena 3D, profilo, stack, concept di progetto, processo, servizi e moduli preventivo/appuntamento/contatto.
- `admin.html`: area CMS protetta da Firebase Authentication.
- `js/firebase.js`: configurazione Firebase web del progetto `studio-83022`.
- `js/main.js`: scena Three.js, moduli pubblici e caricamento contenuti da Firestore.
- `js/admin/admin.js`: login Firebase Auth, autorizzazione admin, CRUD per progetti/servizi/competenze, impostazioni sito e richieste.
- `firestore.rules`: regole Firestore da copiare/pubblicare.
- `docs/FIREBASE-SETUP.md`: configurazione Firebase passo-passo.

## Avvio locale

I moduli ES e gli import CDN non vanno aperti tramite `file://`. Avvia un server statico nella cartella estratta:

### Python
```bash
python -m http.server 8000
```
Poi apri `http://localhost:8000`.

In alternativa usa l'estensione Live Server di VS Code o un hosting statico HTTPS. Non è necessario `npm install`.

## Configurazione Firebase obbligatoria

1. Apri Firebase Console e seleziona il progetto `studio-83022`.
2. In **Authentication → Sign-in method**, abilita **Email/Password**.
3. In **Authentication → Users**, crea l'utente amministratore con la tua email e una password robusta. Non inserire email o password admin nel codice del sito.
4. In **Firestore Database**, crea il database se non è già attivo.
5. Pubblica il contenuto del file `firestore.rules` nella scheda **Firestore Database → Rules** e premi **Publish**.
6. In **Firestore Database → Data**, crea una collezione `admins`. Crea un documento con ID esattamente uguale all'**UID** dell'utente amministratore mostrato in Authentication → Users. Il documento deve contenere il campo booleano `active` impostato a `true`. Non usare l'email come ID, usa l'UID.
7. Ricarica `admin.html`, accedi con l'utente creato e la password. Se l'utente era già autenticato prima di aggiungere il documento `admins/{uid}`, esci e accedi di nuovo.
8. Per inizializzare le impostazioni del sito, entra in CMS → **Impostazioni sito** e salva. Per mostrare contenuti Firestore, crea i record dal CMS e attiva “Visibile sul sito”.

### Schema admin

```text
admins
  └── UID_ESATTO_UTENTE_AUTH
       └── active: true (boolean)
```

Le regole negano ai client ogni creazione/modifica/cancellazione nella collezione `admins`. L'assegnazione del ruolo avviene manualmente dalla Console Firebase, che opera con privilegi di progetto.

## Regole Firebase in formato testuale

Il file `firestore.rules` incluso nello ZIP è il riferimento da pubblicare. Usa autorizzazione basata su `admins/{uid}` con `active: true`, non credenziali hardcoded e non una semplice email verificata. Il modulo admin e le regole applicano lo stesso criterio.

Le richieste pubbliche possono essere create solo se rispettano schema e limiti; lettura, modifica e cancellazione sono consentite esclusivamente agli admin. I contenuti `projects`, `services` e `skills` sono leggibili pubblicamente solo quando `visible == true`; la gestione è admin-only. Tutto il resto è negato per impostazione predefinita.

## Struttura dati

### `site/settings`
Campi stringa: `brandName`, `heroTitle`, `heroSubtitle`, `contactEmail`.

### `projects`
Campi attesi: `title`, `description`, `category`, `imageUrl` (facoltativo), `background` (facoltativo), `visualLabel` (facoltativo), `order` (numero), `visible` (booleano). I record pubblici vengono ordinati per `order`.

### `services`
Campi attesi: `title`, `kicker`, `description`, `price`, `tags`, `order`, `visible`.

### `skills`
Campi attesi: `title`, `category`, `description` (facoltativo), `level` (facoltativo), `order`, `visible`. La sezione competenze è gestibile dal CMS; la prima versione del sito mostra comunque la griglia visuale statica fino a una futura integrazione della sezione con i record.

### `requests`
Il modulo pubblico crea richieste con `requestType` (`contact`, `quote`, `appointment`), `name`, `email`, `message`, `privacyConsent`, `source`, `status`, `createdAt` e campi opzionali `company`, `projectType`, `requestedDate`. L'appuntamento richiede `requestedDate`.

## Note importanti prima della pubblicazione

- La configurazione Firebase web è identificativa, non è una chiave segreta. La protezione si basa su Authentication e Firestore Security Rules. Non inserire mai service account o chiavi Admin SDK nel sito pubblico.
- La sicurezza e la gestione dello spam richiedono anche configurazione appropriata di App Check, limiti/monitoraggio e, se necessario, un endpoint server-side o Cloud Function. Le regole non sostituiscono un sistema anti-abuso completo.
- Il modulo raccoglie dati personali: prima del rilascio sostituisci la nota provvisoria con una privacy policy adeguata, verifica gli obblighi applicabili e aggiungi i recapiti reali.
- I concept ORBITAL, FRAME, PULSE e STAY sono demo illustrative, non clienti o incarichi commerciali dichiarati. Sostituiscili dal CMS con lavori reali.
- I prezzi mostrati sono fasce di partenza illustrative e devono essere confermati o modificati prima della pubblicazione.
- Il CMS modifica i contenuti e le impostazioni previste dai campi disponibili; non permette di modificare in sicurezza codice JavaScript eseguibile o funzioni arbitrarie dal browser.
- Il pacchetto usa CDN esterni (Three.js e Firebase SDK) e Google Fonts; per un deployment aziendale valuta versionamento, CSP e disponibilità dei provider.

## Troubleshooting

- **Login non autorizzato:** verifica che il documento `admins/{uid}` esista e contenga `active: true` booleano. L'ID deve essere l'UID Firebase Auth, non l'email.
- **`auth/operation-not-allowed`:** abilita Email/Password in Authentication.
- **Il sito non legge contenuti:** pubblica le regole, controlla i nomi delle collezioni e assicurati che il record abbia `visible: true` e un campo numerico `order`.
- **Il modulo non invia:** verifica Firestore, regole pubblicate, consenso privacy selezionato e messaggio di almeno 10 caratteri.
- **Errore indice Firestore:** se Firebase richiede un indice composito, segui il link generato nella console; in questa versione le query dei contenuti usano `visible` e `order`.


## Live chat in tempo reale

Il sito pubblico include un pannello chat apri/chiudi; dal CMS, nella scheda **Live chat**, puoi selezionare le conversazioni e rispondere in tempo reale. I messaggi sono salvati in Cloud Firestore.

Prima di utilizzare la chat nel progetto Firebase `studio-83022`:

1. Apri **Firebase Console → Authentication → Sign-in method**.
2. Abilita **Anonymous** per le sessioni dei visitatori e mantieni **Email/Password** per l'accesso CMS.
3. Pubblica le regole contenute in `firestore.rules` da **Firestore Database → Rules**.
4. Verifica che l'account CMS abbia il documento `admins/{UID}` con campo booleano `active: true`.
5. Avvia il sito via server locale/hosting HTTPS; i moduli ES e Firebase non sono progettati per essere aperti con doppio clic su `index.html`.

Le conversazioni sono associate all'UID Firebase anonimo del visitatore. Il ripristino della conversazione è previsto sullo stesso browser/dispositivo; cancellare i dati locali o usare un altro dispositivo non ripristina automaticamente la chat. La chat richiede rete e configurazione Firebase valide.

## Migliorie Live Chat

La chat pubblica mostra un badge con il numero di nuovi messaggi e un avviso in pagina quando arriva una risposta mentre il pannello è ridotto. Se il browser ha già concesso il permesso alle notifiche e la scheda è in background, può mostrare anche una notifica di sistema; il sito non richiede automaticamente tale permesso. L'area admin include ricerca e filtri per stato, anteprima e orario dell'ultimo messaggio. I campi di composizione si adattano al testo e mostrano il conteggio dei caratteri; `Invio` invia il messaggio e `Maiusc + Invio` inserisce una nuova riga.


## Allegati chat — modalità locale temporanea

Gli allegati vengono salvati nel browser tramite IndexedDB; **Firebase Storage non è necessario**. Il limite è 5 MB per file. Per motivi tecnici, il file resta disponibile soltanto nel browser/dispositivo che lo ha allegato: Firestore sincronizza il messaggio e i metadati, ma non il contenuto binario. L'altro interlocutore vedrà il riferimento all'allegato, ma non potrà scaricarlo da un altro dispositivo. Non cancellare i dati del sito/browser se vuoi conservarli.

Per abilitare questa modalità, pubblica il file `firestore.rules` aggiornato nella console Firebase. Non serve configurare né pubblicare `storage.rules`. L'architettura usa il modulo `js/local-attachments.js` come adapter temporaneo; in futuro può essere sostituito con un adapter backend mantenendo invariati i componenti UI delle chat.
