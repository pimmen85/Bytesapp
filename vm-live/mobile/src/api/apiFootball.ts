/**
 * API-Football (api-sports.io) – förstavalet enligt API-RESEARCH.md.
 * VM 2026 = league 1, season 2026. Auth via header `x-apisports-key`.
 *
 * Endpoints:
 *   GET /fixtures?league=1&season=2026     – alla matcher
 *   GET /fixtures?live=all                 – allt som är live (filtreras på league 1)
 *   GET /fixtures/events?fixture={id}      – tidslinje
 */
import type {
  Bracket,
  BracketMatch,
  GroupStanding,
  Match,
  MatchDataProvider,
  MatchEvent,
  MatchEventType,
  MatchStatus,
  StandingRow,
} from './types';

const BASE = 'https://v3.football.api-sports.io';
const WC_LEAGUE = 1;
const WC_SEASON = 2026;

interface AfTeam {
  id: number;
  name: string;
  logo: string;
}
interface AfFixture {
  fixture: {
    id: number;
    date: string;
    venue: { name: string | null; city: string | null };
    status: { short: string; elapsed: number | null };
  };
  league: { id: number; round: string };
  teams: { home: AfTeam; away: AfTeam };
  goals: { home: number | null; away: number | null };
}
interface AfEvent {
  time: { elapsed: number | null };
  team: { id: number; name: string };
  player: { name: string | null };
  assist: { name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Own Goal" | "Penalty" | "Yellow Card" | "Red Card" ...
}

function mapStatus(short: string): MatchStatus {
  switch (short) {
    case 'NS':
    case 'TBD':
      return 'SCHEDULED';
    case '1H':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'LIVE';
    case 'HT':
      return 'HALFTIME';
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'FINISHED';
    case 'PST':
      return 'POSTPONED';
    default:
      return 'UNKNOWN';
  }
}

function mapEventType(type: string, detail: string): MatchEventType {
  const d = detail.toLowerCase();
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

export class ApiFootballProvider implements MatchDataProvider {
  readonly name = 'api-football';
  constructor(private apiKey: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'x-apisports-key': this.apiKey },
    });
    if (!res.ok) {
      throw new Error(`API-Football ${path} svarade ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private toMatch(f: AfFixture): Match {
    const homeId = String(f.teams.home.id);
    return {
      id: String(f.fixture.id),
      status: mapStatus(f.fixture.status.short),
      minute: f.fixture.status.elapsed ?? undefined,
      kickoff: f.fixture.date,
      home: { id: homeId, name: f.teams.home.name, crest: f.teams.home.logo },
      away: {
        id: String(f.teams.away.id),
        name: f.teams.away.name,
        crest: f.teams.away.logo,
      },
      homeScore: f.goals.home ?? 0,
      awayScore: f.goals.away ?? 0,
      stage: f.league.round,
      venue: [f.fixture.venue.name, f.fixture.venue.city]
        .filter(Boolean)
        .join(', '),
      events: [],
    };
  }

  async getFixtures(date?: string): Promise<Match[]> {
    const q = date
      ? `?league=${WC_LEAGUE}&season=${WC_SEASON}&date=${date}`
      : `?league=${WC_LEAGUE}&season=${WC_SEASON}`;
    const data = await this.get<{ response: AfFixture[] }>(`/fixtures${q}`);
    return data.response.map((f) => this.toMatch(f));
  }

  async getLiveMatches(): Promise<Match[]> {
    const data = await this.get<{ response: AfFixture[] }>(
      `/fixtures?live=all`,
    );
    // ?live=all stödjer inte league-filter, så vi filtrerar VM-ligan klientside.
    return data.response
      .filter((f) => f.league?.id === WC_LEAGUE)
      .map((f) => this.toMatch(f));
  }

  async getMatch(id: string): Promise<Match | null> {
    const data = await this.get<{ response: AfFixture[] }>(
      `/fixtures?id=${id}`,
    );
    const f = data.response[0];
    if (!f) return null;
    const match = this.toMatch(f);
    match.events = await this.getEvents(id, match);
    return match;
  }

  async getStandings(): Promise<GroupStanding[]> {
    interface AfStandingRow {
      rank: number;
      team: { id: number; name: string; logo: string };
      points: number;
      goalsDiff: number;
      group: string;
      all: {
        played: number;
        win: number;
        draw: number;
        lose: number;
        goals: { for: number; against: number };
      };
    }
    const data = await this.get<{
      response: { league: { standings: AfStandingRow[][] } }[];
    }>(`/standings?league=${WC_LEAGUE}&season=${WC_SEASON}`);
    const groups = data.response[0]?.league.standings ?? [];
    return groups.map((rows): GroupStanding => ({
      group: rows[0]?.group ?? 'Grupp',
      rows: rows.map((r): StandingRow => ({
        team: { id: String(r.team.id), name: r.team.name, crest: r.team.logo },
        rank: r.rank,
        played: r.all.played,
        won: r.all.win,
        drawn: r.all.draw,
        lost: r.all.lose,
        goalsFor: r.all.goals.for,
        goalsAgainst: r.all.goals.against,
        goalDiff: r.goalsDiff,
        points: r.points,
        qualifies: r.rank <= 2,
      })),
    }));
  }

  async getBracket(): Promise<Bracket> {
    // API-Football har ingen bracket-endpoint; vi härleder från slutspelsmatcher.
    const ORDER: { key: string; label: string }[] = [
      { key: 'round of 32', label: 'Sextondelsfinal' },
      { key: 'round of 16', label: 'Åttondelsfinal' },
      { key: 'quarter', label: 'Kvartsfinal' },
      { key: 'semi', label: 'Semifinal' },
      { key: '3rd place', label: 'Bronsmatch' },
      { key: 'final', label: 'Final' },
    ];
    const fixtures = await this.getFixtures();
    const buckets = new Map<string, BracketMatch[]>(ORDER.map((o) => [o.label, []]));
    for (const m of fixtures) {
      const stage = (m.stage ?? '').toLowerCase();
      // Tilldela till FÖRSTA matchande rundan så "quarter-finals" inte även
      // hamnar under "final".
      const hit = ORDER.find((o) => stage.includes(o.key));
      if (!hit) continue;
      buckets.get(hit.label)!.push({
        id: m.id,
        round: hit.label,
        home: m.home,
        away: m.away,
        homeScore: m.status === 'SCHEDULED' ? undefined : m.homeScore,
        awayScore: m.status === 'SCHEDULED' ? undefined : m.awayScore,
        status: m.status,
        kickoff: m.kickoff,
      });
    }
    const rounds = ORDER.map((o) => ({ round: o.label, matches: buckets.get(o.label)! }))
      .filter((r) => r.matches.length > 0);
    return { rounds };
  }

  private async getEvents(fixtureId: string, match: Match): Promise<MatchEvent[]> {
    const data = await this.get<{ response: AfEvent[] }>(
      `/fixtures/events?fixture=${fixtureId}`,
    );
    return data.response
      .map((e, i): MatchEvent => {
        const side: 'home' | 'away' =
          e.team.name === match.home.name ? 'home' : 'away';
        return {
          id: `${fixtureId}-${i}`,
          type: mapEventType(e.type, e.detail),
          minute: e.time.elapsed ?? undefined,
          side,
          player: e.player.name ?? undefined,
          assist: e.assist.name ?? undefined,
          detail: e.detail,
        };
      })
      .reverse(); // nyaste först
  }
}
