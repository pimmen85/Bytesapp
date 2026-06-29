/**
 * Matchdata-providers för servern (speglar mobilappens datalager).
 * Väljs via env MATCH_PROVIDER = mock | api-football | football-data.
 *
 * Normaliserad match-form:
 *   { id, status, minute, home:{id,name,code}, away:{...}, homeScore, awayScore,
 *     stage, events:[{ type, minute, side, player, detail }] }
 */

const AF_BASE = 'https://v3.football.api-sports.io';
const FD_BASE = 'https://api.football-data.org/v4';
const WC_LEAGUE = 1;
const WC_SEASON = 2026;

function mapAfStatus(short) {
  if (['NS', 'TBD'].includes(short)) return 'SCHEDULED';
  if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(short)) return 'LIVE';
  if (short === 'HT') return 'HALFTIME';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'FINISHED';
  return 'UNKNOWN';
}

function mapAfEventType(type, detail) {
  const d = (detail || '').toLowerCase();
  if (type === 'Goal') {
    if (d.includes('own')) return 'OWN_GOAL';
    if (d.includes('penalty')) return 'PENALTY_GOAL';
    return 'GOAL';
  }
  if (type === 'Card') return d.includes('red') ? 'RED_CARD' : 'YELLOW_CARD';
  if (type === 'subst') return 'SUBSTITUTION';
  if (type === 'Var') return 'VAR';
  return 'GOAL';
}

class ApiFootballProvider {
  constructor(key) {
    this.name = 'api-football';
    this.key = key;
  }
  async #get(path) {
    const res = await fetch(`${AF_BASE}${path}`, {
      headers: { 'x-apisports-key': this.key },
    });
    if (!res.ok) throw new Error(`API-Football ${path} -> ${res.status}`);
    return res.json();
  }
  #toMatch(f) {
    return {
      id: String(f.fixture.id),
      status: mapAfStatus(f.fixture.status.short),
      minute: f.fixture.status.elapsed ?? undefined,
      home: { id: String(f.teams.home.id), name: f.teams.home.name },
      away: { id: String(f.teams.away.id), name: f.teams.away.name },
      homeScore: f.goals.home ?? 0,
      awayScore: f.goals.away ?? 0,
      stage: f.league?.round,
      events: [],
    };
  }
  async getLiveMatches() {
    const data = await this.#get('/fixtures?live=all');
    return data.response
      .filter((f) => f.league?.id === WC_LEAGUE)
      .map((f) => this.#toMatch(f));
  }
  async getEvents(fixtureId, match) {
    const data = await this.#get(`/fixtures/events?fixture=${fixtureId}`);
    return data.response.map((e, i) => ({
      id: `${fixtureId}-${i}`,
      type: mapAfEventType(e.type, e.detail),
      minute: e.time?.elapsed ?? undefined,
      side: e.team?.name === match.home.name ? 'home' : 'away',
      player: e.player?.name ?? undefined,
      detail: e.detail,
    }));
  }
}

function mapFdStatus(s) {
  if (['SCHEDULED', 'TIMED'].includes(s)) return 'SCHEDULED';
  if (['IN_PLAY', 'LIVE'].includes(s)) return 'LIVE';
  if (s === 'PAUSED') return 'HALFTIME';
  if (s === 'FINISHED') return 'FINISHED';
  return 'UNKNOWN';
}

class FootballDataProvider {
  constructor(token) {
    this.name = 'football-data';
    this.token = token;
  }
  async #get(path) {
    const res = await fetch(`${FD_BASE}${path}`, {
      headers: { 'X-Auth-Token': this.token },
    });
    if (!res.ok) throw new Error(`football-data ${path} -> ${res.status}`);
    return res.json();
  }
  async getLiveMatches() {
    const data = await this.#get('/competitions/WC/matches?status=LIVE');
    return data.matches.map((m) => ({
      id: String(m.id),
      status: mapFdStatus(m.status),
      minute: m.minute ?? undefined,
      home: { id: String(m.homeTeam.id), name: m.homeTeam.name, code: m.homeTeam.tla },
      away: { id: String(m.awayTeam.id), name: m.awayTeam.name, code: m.awayTeam.tla },
      homeScore: m.score?.fullTime?.home ?? 0,
      awayScore: m.score?.fullTime?.away ?? 0,
      stage: m.group ?? m.stage,
      events: [],
    }));
  }
  async getEvents() {
    // Gratis-tieren ger ingen rik event-feed; mål upptäcks via score-diff.
    return [];
  }
}

/**
 * MockProvider: en simulerad live-match som får ett nytt mål var ~20:e sekund,
 * så att man kan se hela push-flödet end-to-end utan API-nyckel.
 */
class MockProvider {
  constructor() {
    this.name = 'mock';
    this.start = Date.now();
    this.goals = [
      { at: 8, side: 'home', player: 'Gyökeres' },
      { at: 20, side: 'away', player: 'Yamal' },
      { at: 33, side: 'home', player: 'Isak' },
      { at: 50, side: 'home', player: 'Gyökeres' },
    ];
  }
  #current() {
    // 1 "matchminut" = 1 verklig sekund i mock, så det går fort att testa.
    const sec = Math.floor((Date.now() - this.start) / 1000);
    const fired = this.goals.filter((g) => g.at <= sec);
    const events = fired.map((g, i) => ({
      id: `mock-${i}`,
      type: 'GOAL',
      minute: g.at,
      side: g.side,
      player: g.player,
    }));
    return {
      id: 'mock-live-1',
      status: sec >= 90 ? 'FINISHED' : 'LIVE',
      minute: Math.min(sec, 90),
      home: { id: 'swe', name: 'Sverige', code: 'SE' },
      away: { id: 'esp', name: 'Spanien', code: 'ES' },
      homeScore: fired.filter((g) => g.side === 'home').length,
      awayScore: fired.filter((g) => g.side === 'away').length,
      stage: 'Åttondelsfinal',
      events,
    };
  }
  async getLiveMatches() {
    const m = this.#current();
    return m.status === 'FINISHED' ? [] : [m];
  }
  async getEvents() {
    return this.#current().events;
  }
}

export function createProvider() {
  const choice = (process.env.MATCH_PROVIDER || 'mock').toLowerCase();
  if (choice === 'api-football' && process.env.API_FOOTBALL_KEY) {
    return new ApiFootballProvider(process.env.API_FOOTBALL_KEY);
  }
  if (choice === 'football-data' && process.env.FOOTBALL_DATA_TOKEN) {
    return new FootballDataProvider(process.env.FOOTBALL_DATA_TOKEN);
  }
  return new MockProvider();
}
