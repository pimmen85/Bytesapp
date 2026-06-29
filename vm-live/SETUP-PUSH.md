# 🔔 Sätt upp riktiga push-notiser till din telefon

Mål: få en **push i fickan när det blir mål i VM – även när appen är stängd**.

> **Viktigt att veta:** sedan Expo SDK 53 fungerar *fjärr-push* (det vi vill ha) **inte i Expo Go** –
> du behöver en liten **development build** av appen. Det låter krångligt men är ~15 min, och på
> **Android är det enklast** (du installerar bara en APK – ingen Apple-avgift behövs).
> Lokala notiser (när appen är öppen) funkar redan i Expo Go om du bara vill smaka snabbt.

Det finns två bitar: **(A) appen på telefonen** och **(B) servern som pushar**. Gör A och B, koppla ihop, klart.

---

## Förkrav (engångs)
1. Node 20+ installerat.
2. Ett gratis **Expo-konto** → https://expo.dev (skapa konto).
3. EAS CLI: `npm install -g eas-cli`

---

## A. Appen på din telefon (development build)

```bash
cd vm-live/mobile
npm install
eas login                 # logga in med ditt Expo-konto
eas init                  # skapar Expo-projektet + skriver in projectId i app.json
```

### Android (enklast – rekommenderas)
```bash
eas build --profile development --platform android
```
- Bygget körs i molnet (~10 min). Du får en **APK-länk** + QR-kod.
- Öppna länken på telefonen, installera APK:n, öppna appen.
- Första gången pushen ska gå: EAS frågar om att sätta upp **FCM** (Android-push). Säg ja –
  `eas credentials` sköter det. (Expo använder dina FCM-uppgifter för att leverera push.)

### iPhone (kräver Apple Developer-konto, 99 USD/år)
```bash
eas device:create          # registrera din iPhone (följ länken på telefonen)
eas build --profile development --platform ios
```
- Installera bygget via länken. (Utan Apple-konto går iOS-push inte att testa på riktig enhet –
  då är Android-vägen klart enklast.)

### Peka appen mot servern
I `vm-live/mobile/app.json`, under `expo.extra`, sätt `pushBackendUrl` till din server (se del B):
```jsonc
"extra": {
  "matchDataProvider": "api-football",
  "apiFootballKey": "",                    // appen behöver inte nyckeln om servern har den
  "pushBackendUrl": "https://DIN-SERVER"   // t.ex. Render-URL, eller http://192.168.x.x:4000 lokalt
}
```
Starta dev-appen:
```bash
npx expo start --dev-client
```
Öppna appen på telefonen → fliken **Notiser** → **Slå på notiser**. Appen hämtar en Expo-push-token
och registrerar den hos servern.

---

## B. Servern som skickar push

Servern behöver bara nås av telefonen för registrering; själva pushen går server → Expo → telefon.

### Val 1 – Snabbast: kör lokalt på datorn
```bash
cd vm-live/server
npm install
MATCH_PROVIDER=api-football API_FOOTBALL_KEY=din_nyckel npm start
```
- Sätt `pushBackendUrl` i appen till `http://<datorns-LAN-IP>:4000` (telefon + dator på samma WiFi).
  Hitta IP: macOS `ipconfig getifaddr en0`, Linux `hostname -I`, Windows `ipconfig`.
- Datorn måste vara på. Bra för test.

### Val 2 – Alltid på: deploya gratis till Render
1. Pusha repot till GitHub (klart om du mergeat PR:en).
2. På https://render.com → **New ▸ Blueprint** → välj repot (`render.yaml` finns i `vm-live/server/`).
3. Fyll i `API_FOOTBALL_KEY` (eller `FOOTBALL_DATA_TOKEN`) i dashboarden.
4. Du får en publik URL, t.ex. `https://mal-vm-live-server.onrender.com` → använd den som `pushBackendUrl`.

> Skarp data: skaffa nyckel på https://www.api-football.com (förstaval) eller gratis på
> https://www.football-data.org. Se [`API-RESEARCH.md`](./API-RESEARCH.md). Utan nyckel kör servern
> mock-data (en simulerad live-match som målar var ~20:e sekund – perfekt för att testa pushflödet).

---

## ✅ Verifiera att det funkar
1. Slå på notiser i appen (steg A) → kolla att enheten registrerats:
   ```bash
   curl https://DIN-SERVER/health        # devices ska vara >= 1
   ```
2. Skicka en testpush till alla registrerade enheter:
   ```bash
   curl -X POST https://DIN-SERVER/push/test
   ```
   → telefonen ska pinga med "⚽ Testnotis" **även om appen är stängd**. 🎉
3. Riktiga mål: med `MATCH_PROVIDER=api-football` + nyckel pollar servern live VM-matcher var 15:e s
   och pushar automatiskt vid mål / rött kort / avspark / slutsignal.

---

## Felsökning
- **Ingen push på Android:** kör `eas credentials` och kontrollera att FCM är uppsatt för projektet.
- **`devices: 0`:** appen nådde inte servern vid registrering – kolla `pushBackendUrl` (rätt IP/URL, port 4000 öppen lokalt).
- **iOS, inget händer:** kräver Apple Developer-konto + att enheten registrerats via `eas device:create`.
- **Token loggas som null:** push-token kräver en *fysisk enhet* (inte simulator) och en development build (inte Expo Go).
