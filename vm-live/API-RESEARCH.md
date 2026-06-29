# API-Research: Matchdata för VM 2026 (live, mål, notiser)

> Vilka datakällor ger oss livescore + målhändelser så vi kan notisa vid varje mål?
> Sammanställt 2026-06-29. Verifierat via WebSearch (några doc-sidor svarar 403 på
> automatiska hämtningar – bekräfta exakta `season`/`fixtureId` mot ditt eget API-nyckel-svar innan release).

## Kortversion / beslut

| API | Gratis? | VM 2026 | Live | Målhändelser | Pris (betalt) | Dom |
|---|---|---|---|---|---|---|
| **API-Football** (api-sports.io) | 100 req/dag | ✅ `league=1&season=2026` | Poll ~15s | ✅ `fixtures/events` | ~$19–29/mån | **🏆 Förstaval** |
| **football-data.org** | 10 req/min, ingen dagsgräns | ✅ kod `WC` | Poll, `status=LIVE` | ⚠️ Bara mål/scorer, ej rik timeline | ~€29/mån | **Gratis fallback** |
| TheSportsDB | Nyckel `123`, ej live | ✅ | 2-min (premium) | ⚠️ svag | $9/mån | Billig redundans |
| SportMonks | Ej VM på free | ✅ säsong `26618` | <15s + webhooks | ✅ rik | €69/mån | Bäst data, dyrt |
| Sportradar | Trial utan VM | ✅ | Push-feeds | ✅ guld | $500+/mån | Enterprise, overkill |

**Vår strategi:** Bygg ett utbytbart `MatchDataProvider`-interface. Default-implementation
är **API-Football**. `football-data.org` finns som gratis fallback. En `MockProvider`
används för demo/utveckling utan nyckel (simulerar en live-match med mål).

---

## 1. API-Football (api-sports.io) — förstaval 🏆

- **Base URL:** `https://v3.football.api-sports.io/`
- **Auth:** header `x-apisports-key: DIN_NYCKEL` (registrera på api-sports.io, inget kort för free).
- **Free tier:** **100 req/dag**, 10 req/min. Headers `x-ratelimit-requests-remaining` visar kvar.
- **VM 2026:** `league=1`, `season=2026`.
- **Live:** REST-polling, timeline uppdateras ~var 15:e sekund → polla var 15:e s.
- **Målhändelser:** `fixtures/events` ger varje mål/kort/byte/VAR med `time.elapsed` (minut),
  `team`, `player`, `type` ("Goal"), `detail` ("Normal Goal"/"Penalty"/"Own Goal").

**Endpoints:**
```bash
# (a) Alla VM-matcher 2026
curl "https://v3.football.api-sports.io/fixtures?league=1&season=2026" \
  -H "x-apisports-key: DIN_NYCKEL"

# (b) Allt som är live just nu (en enda call täcker alla pågående matcher)
curl "https://v3.football.api-sports.io/fixtures?live=all" -H "x-apisports-key: DIN_NYCKEL"

# (c) Tidslinje/händelser för en match
curl "https://v3.football.api-sports.io/fixtures/events?fixture=1234567" -H "x-apisports-key: DIN_NYCKEL"
```

**Svarsform (fixtures):** `response[].fixture.id`, `.fixture.status.short` (`1H`/`HT`/`2H`/`FT`),
`.fixture.status.elapsed`, `.teams.home/away.name`, `.goals.home`, `.goals.away`.
**Events:** `response[].time.elapsed`, `.team.name`, `.player.name`, `.type`, `.detail`.

**Pris betalt:** Pro ~$19/mån (~75k req/dag), Ultra ~$29/mån (~150k/dag).
**Obs:** 100 req/dag räcker till utveckling och score-prototyp men inte riktig live-polling
under en hel matchdag → uppgradera till ~$19/mån när du kör skarpt.

---

## 2. football-data.org — gratis fallback

- **Base URL:** `https://api.football-data.org/v4/`
- **Auth:** header `X-Auth-Token: DIN_TOKEN` (gratis registrering).
- **Free:** 10 req/min, ingen tydlig dagsgräns. VM ingår gratis (kod **`WC`**).
- **Live:** filtrera `status=LIVE` (`IN_PLAY` + `PAUSED`).
- **Målhändelser:** begränsat – score + scorer/minut, ingen rik per-event-timeline (det är betalt).
  Räcker för att notisa vid *målförändring*, sämre för full tidslinje.

```bash
curl 'https://api.football-data.org/v4/competitions/WC/matches?status=LIVE' \
  -H "X-Auth-Token: DIN_TOKEN"
```
**Svarsform:** `matches[].id`, `.status`, `.minute`, `.homeTeam.name`, `.awayTeam.name`,
`.score.fullTime.home/away`, `.score.halfTime`.

---

## 3. TheSportsDB ($9/mån) · 4. SportMonks (€69/mån) · 5. Sportradar ($500+)

- **TheSportsDB:** free-nyckel `123` (ingen live). Premium $9/mån → V2 med ~2-min livescore.
  Bra som *andra oberoende feed* för redundans. `GET /api/v2/json/livescore/soccer` (header `X-API-KEY`).
- **SportMonks:** bäst datakvalitet, season ID `26618`, <15s + webhooks, men VM kräver
  €69/mån-plan (free täcker bara 2 ligor). Välj om du vill ha xG/predictions.
- **Sportradar:** officiell FIFA-partner, äkta push-feeds, men enterprise-pris ($500–1000+/mån). Overkill.

**Nisch-VM-API:er värda att känna till:** live-score-api.com, KickoffAPI (gratis 100 req/dag),
wc2026api.com, Highlightly. Mindre beprövade – håll som backup.

---

## 🔁 Mål-detektering: polling-strategi (det vi implementerar i `server/`)

1. **Hitta vad som är live (billigt, var 5–10:e min):** `GET /fixtures?league=1&season=2026&date=IDAG`
   eller `?live=all`. Bara matcher med status `1H/HT/2H/ET` behöver snabb-pollas.
2. **Snabb-polla live-matcher var 15:e s:** `GET /fixtures?live=all` (en call → alla live-matcher).
   Håll `Map<fixtureId, {home, away, lastEventId}>` i minnet/DB.
3. **Diffa mål – två signaler:**
   - **Score-diff (snabb):** jämför `goals.home/away` mot senast kända → ökning = mål.
   - **Event-diff (exakt):** vid scoreändring, hämta `fixtures/events?fixture=id`, ta nya events
     (dedupe-nyckel `elapsed+player+type`), bygg notis ("⚽ 67' Mbappé — Frankrike 2–1 Argentina").
4. **Dedupe/idempotens:** spara per-match-set av redan notifierade event så omhämtning aldrig dubbel-notisar.
   **VAR kan ångra mål** → hantera score-*minskning* (skicka korrigering eller tysta).
5. **Backoff & gränser:** respektera `X-RateLimit-Remaining`; sluta snabb-polla vid status `FT`.

**Kvotmatematik:** `?live=all` är *en* call för alla samtidiga matcher. Var 15:e s = ~240 calls/timme
– långt under en $19/mån-plan, men över free-gränsen 100/dag så fort man lägger till event-lookups.
Free räcker till dev + score-prototyp; betala ~$19–29/mån för skarp live.

### Källor
API-Football: [VM-guide](https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports) ·
[Pris](https://www.api-football.com/pricing) · [Rate limit](https://www.api-football.com/news/post/how-ratelimit-works) ·
[Docs](https://api-sports.io/documentation/football/v3) ·
football-data.org: [Policies](https://docs.football-data.org/general/v4/policies.html) ·
[Match](https://docs.football-data.org/general/v4/match.html) ·
[TheSportsDB](https://www.thesportsdb.com/free_sports_api) ·
[SportMonks VM](https://www.sportmonks.com/football-api/world-cup-api/) ·
[Sportradar](https://developer.sportradar.com/soccer/reference/soccer-api-overview) ·
Best practices: [Sportmonks livescore-blogg](https://www.sportmonks.com/blogs/building-a-real-time-livescore-app-with-a-football-api-best-practices/) ·
[TheFinch sports UX](https://thefinch.design/sports-app-ux-design-cricket-fantasy-live-score-platforms/)
