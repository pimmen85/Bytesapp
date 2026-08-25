# Bytesapp

| App | Fil | Vad den gör |
|-----|-----|-------------|
| **Bytesappen** | `index.html` | Lag, spelare, byten och speltidsstatistik under match. |
| **Fotbollstimern** | `fotbollstimer.html` | Snabb dubbeltimer: periodklocka (förinställd 3 × 20 min) + bytesklocka var 5:e minut. |
| **Matchtimern** | `matchtimer/` | Samma dubbeltimer som PWA med offline-stöd och målvaktsrotation. |

## Fotbollstimern

En enda HTML-fil utan beroenden – öppna den direkt i mobilen eller lägg den på startskärmen.

- **Periodklockan** räknar ner perioden och visar vilken period av totalt som spelas.
- **Bytesklockan** räknar ner till nästa byte, larmar och startar om automatiskt. `↻ Byte gjort` startar om den direkt när ni bytt tidigare än planerat.
- Signal med ljud, vibration och blinkning vid byte och periodslut, skärmen hålls tänd under matchen.
- Perioder, periodlängd och bytesintervall ändras under ⚙ och sparas till nästa match. Standard är 3 × 20 min med byte var 5:e minut.
- På dator: mellanslag startar/pausar, `B` markerar ett byte.

```bash
python3 -m http.server 8099   # öppna http://localhost:8099/fotbollstimer.html
```
