# Matchtimern

En fristående, snabb dubbeltimer för lagidrott — helt separat från **Bytesapp** i repots rot.

- **Matchtid** – en klocka per period. Välj antal perioder (2 = halvlekar) och minuter per period.
- **Nästa byte** – en parallell klocka som påminner om spelarbyten med valfritt intervall.

Larm ges med ljud, vibration och en kort blinkning både vid byte och periodslut. Skärmen hålls tänd under matchen (Wake Lock), och appen fungerar offline och kan installeras på hemskärmen (PWA).

## Testa som "publicerad" på mobilen (GitHub Pages)

Allt är statiska filer – ingen server eller bygg behövs.

1. Gå till repots **Settings → Pages** på GitHub.
2. Under **Source**, välj branchen `claude/football-substitution-timer-dulolf` och mappen `/ (root)`, spara.
3. Efter någon minut nås appen på:
   `https://pimmen85.github.io/bytesapp/matchtimer/`
4. Öppna länken i Chrome på din Fold 6 → menyn → **Lägg till på startskärmen**. Då startar den i helskärm som en app.

## Köra lokalt

```bash
cd matchtimer
python3 -m http.server 8099
# öppna http://localhost:8099/ i webbläsaren
```

## Filer

| Fil | Roll |
|-----|------|
| `index.html` | Hela appen (HTML + CSS + JS, inga beroenden) |
| `manifest.json` | PWA-manifest (namn, ikon, helskärm) |
| `sw.js` | Service worker för offline-stöd |
| `icon.svg` | App-ikon |
