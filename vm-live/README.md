# ⚽ Mål · VM Live 2026

En mobilapp som skickar **push-notiser vid mål** och visar **livescore** för fotbolls-VM 2026.
Byggd som ett **fristående projekt** (separat från Bytesappen) och tänkt att kunna publiceras
till App Store och Google Play.

> **Status:** första körbara versionen ("se var vi landar"). Appen kör direkt på simulerad
> demodata (ingen API-nyckel krävs) och kan kopplas till skarpt fotbolls-API med en rad config.

![stack](https://img.shields.io/badge/app-Expo%20%2F%20React%20Native-1FE078) ![server](https://img.shields.io/badge/server-Node-3DA5FF)

---

## Vad som finns

```
vm-live/
├── RESEARCH.md        ← 17 källor om att bygga en framgångsrik mobilapp 2026 + design-spelbok
├── API-RESEARCH.md    ← jämförelse av fotbolls-/VM-API:er + mål-detekteringsstrategi
├── preview/           ← öppna index.html i valfri webbläsare = se appen direkt (ingen install)
├── mobile/            ← Expo/React Native-appen (livescore-UI + notisinställningar)
└── server/            ← Node-backend som pollar API:t, upptäcker mål och skickar Expo-push
```

## 👀 Se appen utan att installera något
Öppna **[`preview/index.html`](./preview/index.html)** i valfri webbläsare (funkar även på mobilen).
Det är en interaktiv visuell demo med samma designsystem: live-matchen Sverige–Spanien tickar,
du kan klicka på matcher, byta flik och se en **mål-notis** dyka upp. Den riktiga appen
(`mobile/`) skickar skarpa push-notiser till telefonen via `server/`.

### Appen (`mobile/`)
- **Matcher**-flik: live/kommande/spelade VM-matcher, live-badge med pulserande minut, följ lag.
- **Turnering**-flik: **gruppspelstabeller** (med kvalmarkering för topp 2) + **slutspelsträd**.
- **Matchdetalj**: scoreboard + tidslinje (mål, kort, byten) som live-uppdateras var 15:e s.
- **Notiser**-flik: pre-permission priming + **granulära toggles** (mål, avspark, slutsignal,
  röda kort, "endast lag jag följer") och en testnotis-knapp.
- **Dark-first designsystem** (OLED-svart, plangrön accent, tabulära siffror) – se [`RESEARCH.md`](./RESEARCH.md).
- Upptäcker mål lokalt medan appen är öppen (diffar score) och visar notis direkt.

### Servern (`server/`)
- Pollar live-matcher (15s live / 60s idle), diffar mot förra passet, och skickar **Expo-push**
  för mål/VAR/rött kort/avspark/slutsignal – **även när appen är stängd**.
- Idempotent: varje händelse notisas bara en gång. Filtrerar per enhetens följda lag.
- Utbytbart datalager: `mock` (default), `api-football`, `football-data`.

---

## Snabbstart

### 1. Servern (kan köras direkt på mock-data)
```bash
cd server
npm install
npm start          # startar på :4000 med simulerad live-match (mål var ~20:e s)
npm test           # kör enhetstesterna för mål-detektorn
```
Hälsokoll: `curl localhost:4000/health`

### 2. Appen
```bash
cd mobile
npm install
npx expo start     # öppna i Expo Go eller en simulator
```
Appen kör på **mock-data** direkt – du ser en live-match (Sverige–Spanien) ticka med mål,
och kan testa notisflödet på Notiser-fliken.

---

## 🔔 Riktiga push-notiser till din telefon
Se **[`SETUP-PUSH.md`](./SETUP-PUSH.md)** för en exakt steg-för-steg-guide: bygg appen med EAS,
deploya servern (lokalt eller gratis på Render), och verifiera med `curl -X POST <server>/push/test`.
Android är enklast (ingen Apple-avgift). Servern har en `/push/test`-endpoint för snabb verifiering.

## Koppla in skarpt API (när du vill ha riktig VM-data)

Enligt [`API-RESEARCH.md`](./API-RESEARCH.md) är **API-Football** förstavalet och **football-data.org**
ett gratis fallback. Skaffa en nyckel och konfigurera:

**Appen** – `mobile/app.json` → `expo.extra`:
```jsonc
"extra": {
  "matchDataProvider": "api-football",   // eller "football-data"
  "apiFootballKey": "DIN_NYCKEL",
  "footballDataToken": "",
  "pushBackendUrl": "https://din-server.exempel.se"  // för push när appen är stängd
}
```

**Servern** – miljövariabler (se `server/.env.example`):
```bash
MATCH_PROVIDER=api-football
API_FOOTBALL_KEY=din_nyckel
# eller:
# MATCH_PROVIDER=football-data
# FOOTBALL_DATA_TOKEN=din_token
```

> VM 2026 i API-Football = `league=1&season=2026`; i football-data.org = competition-kod `WC`.
> Free-tieren räcker för utveckling; för skarp live-polling under matchdagar, se prissektionen
> i [`API-RESEARCH.md`](./API-RESEARCH.md) (~$19–29/mån).

---

## Arkitektur i korthet

```
                 ┌───────────────┐   push när appen är STÄNGD   ┌──────────────┐
  Fotbolls-API ─▶│  server/      │ ─────────────────────────▶ │  Expo Push   │ ─▶ 📱
  (API-Football) │  poll + diff  │                             └──────────────┘
                 └───────────────┘
                                                   in-app mål-notis när appen är ÖPPEN
  Fotbolls-API ───────────────────────────────────────────────────────────────▶ 📱 mobile/
```

- **Push när appen är stängd:** kräver servern + en Expo-projektnyckel (EAS). Servern håller
  registrerade enheter och skickar via Expo Push API.
- **In-app livescore + notis:** appen pollar själv och visar notis direkt när den är öppen.

## Nästa steg (idéer)
- EAS Build + Submit för publicering till båda butikerna; EAS Update för OTA-fixar.
- Lagdetaljvyer, gruppspelstabeller och slutspelsträd.
- Rich push med lagloggor och deep link rakt in i matchen.
- xG/momentum-grafer (à la FotMob) på matchdetaljskärmen.

---
*Designval och källor: se [`RESEARCH.md`](./RESEARCH.md) och [`API-RESEARCH.md`](./API-RESEARCH.md).*
