# Ripristino pre-mobile

Le copie di index.html e admin.html sono verificate byte per byte contro le impronte registrate prima delle modifiche.

Puoi ripristinarle da PowerShell, dalla cartella del sito:

    Copy-Item -LiteralPath '.BACKUP_PRE_MOBILEindex.html' -Destination '.index.html' -Force
    Copy-Item -LiteralPath '.BACKUP_PRE_MOBILEadmin.html' -Destination '.admin.html' -Force

## anubis.html: copia non verificata

La copia presente in questa cartella è una ricostruzione e il suo hash non coincide con quello originale registrato. Non sovrascrivere anubis.html con questa copia se vuoi tornare esattamente alla versione precedente.

SHA-256 originali registrate:

- index.html: 38A65AC1319B30DF413E56847BCC039A138EE03EF54857841A24F5D204008061
- admin.html: E757EDF8EB687D650A2FDDFE9F6AC85802F769747C98181369A0994C3D27F167
- anubis.html: 8983BC2C22A3A96E2C9CD6F2E3DFD234283E05262846C3EF018896068A56DCF6

Hash delle copie attuali:

- index.html: 38A65AC1319B30DF413E56847BCC039A138EE03EF54857841A24F5D204008061
- admin.html: E757EDF8EB687D650A2FDDFE9F6AC85802F769747C98181369A0994C3D27F167
- anubis.html: DEACA0C135D9C9E4CD1D64760A80D479D17C64364308709BDFC3F1669B7B4353
