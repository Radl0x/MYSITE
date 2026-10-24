# Ripristino del codice precedente alle modifiche mobile/tablet

Questa cartella contiene le copie immutabili dei file originali salvate prima delle modifiche mobile/tablet.

## Comando di ripristino

Quando l'utente scrive **TORNA AL VECCHIO CODICE**, interpreta la richiesta come ripristino dei tre file operativi nella cartella padre di questa cartella:

- `index.html`
- `admin.html`
- `anubis.html`

Prima di sovrascrivere i file correnti, avvisa l'utente che il ripristino sostituirà le modifiche attuali e chiedi una conferma esplicita. Dopo la conferma:

1. Calcola gli hash SHA-256 di tutte e tre le copie e confrontali con gli hash riportati sotto.
2. Se anche un solo hash non coincide, interrompi senza sovrascrivere nulla.
3. Copia le tre copie originali dalla cartella `BACKUP_PRE_MOBILE` alla cartella padre.
4. Ricalcola gli hash dei file ripristinati e verifica che coincidano con gli hash delle copie.
5. Non ricostruire i file a memoria e non modificare questa cartella di backup.

## Hash SHA-256 delle copie originali

- `index.html`: 38A65AC1319B30DF413E56847BCC039A138EE03EF54857841A24F5D204008061
- `admin.html`: E757EDF8EB687D650A2FDDFE9F6AC85802F769747C98181369A0994C3D27F167
- `anubis.html`: 8983BC2C22A3A96E2C9CD6F2E3DFD234283E05262846C3EF018896068A56DCF6

Le copie devono restare intatte e non essere usate come ambiente di sviluppo.
