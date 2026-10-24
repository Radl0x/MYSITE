SITO LUCA BASSU — PACCHETTO CORRETTO
===================================

FILE DEL SITO
- index.html: sito pubblico
- admin.html: dashboard CMS
- anubis.html: pagina di interstitial richiamata dal sito
- images/CMSELBARRIO.png: immagine di fallback usata dal portfolio

MODIFICHE APPLICATE
- La dashboard richiede autenticazione Firebase e un record amministratore esplicitamente abilitato.
- Il titolo hero proveniente da Firestore viene ricostruito consentendo solo testo e tag BR/EM/STRONG/SPAN senza attributi.
- I messaggi toast della dashboard vengono inseriti come testo, non interpretati come HTML.
- Rimossi Firebase Storage e il caricamento file dal CMS: le immagini progetto ora si impostano tramite URL HTTPS.
- Rimossi i campi di configurazione Analytics/Storage non usati dal sito.
- Aggiunte regole Firestore e Storage di base, con accesso negato per impostazione predefinita.
- Escluse dal pacchetto di pubblicazione le vecchie copie annidate e i log; il pacchetto originale non viene alterato.

PASSAGGI OBBLIGATORI IN FIREBASE PRIMA DI USARE IL SITO
1. Apri Firebase Console e seleziona il progetto esistente lucabassu-4cc1c.
2. Authentication > Users: verifica che l'account amministratore corretto esista e sia abilitato. Non creare un nuovo progetto.
3. Copia l'UID esatto dell'account amministratore.
4. Firestore Database: crea manualmente la collezione `admins` e un documento il cui ID è esattamente quell'UID. Il documento deve contenere il campo booleano `enabled: true`. Non creare questo documento dalla dashboard o dal client.
5. Pubblica il contenuto di `firestore.rules` nella sezione Firestore > Rules. Prima di pubblicare, verifica che la struttura dei dati del progetto corrisponda alle collezioni usate da questo sito.
6. Pubblica `storage.rules` in Storage > Rules se il bucket è ancora presente. Queste regole negano ogni accesso perché il sito corretto non usa Storage.
7. Testa in una finestra anonima: i visitatori devono vedere solo progetti pubblicati; l'account admin allowlisted deve accedere alla dashboard; un account autenticato non allowlisted deve essere respinto.
8. Testa l'invio dei due moduli pubblici. Le regole consentono la creazione di richieste con i campi previsti e riservano lettura/modifica/cancellazione all'admin.

IMPORTANTE
- Non posso applicare o pubblicare le regole sul tuo progetto Firebase dall'archivio locale. Finché non completi i passaggi 4 e 5, l'accesso alla dashboard e alcune operazioni Firebase non saranno operative.
- Le regole Firestore forniscono validazione di base, ma non costituiscono un sistema antispam/rate-limit. Per limitare invii automatizzati servirebbe un servizio aggiuntivo; non è stato introdotto in questo pacchetto.
- Per cambiare l'immagine di un progetto, inserisci un URL pubblico HTTPS nel campo immagine della dashboard. Se il progetto usa ancora un URL Firebase Storage precedente, quell'URL potrebbe continuare a funzionare finché il bucket e le regole lo consentono, ma i nuovi upload non sono più supportati.
- Per testare gli script modulari Firebase, apri il sito tramite un server HTTP/HTTPS, non come file file://.
