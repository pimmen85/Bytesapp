/**
 * football-data.org – gratis fallback (kod "WC", auth header X-Auth-Token).
 * Ger score/fixtures/standings men en lättare event-feed än API-Football.
 *
 * Endpoints:
 *   GET /v4/competitions/WC/matches                – alla VM-matcher
 *   GET /v4/competitions/WC/matches?status=LIVE    – pågående
 *   GET /v4/matches/{id}                           – matchdetalj
 */
import type {
  Bracket,
  BracketMatch,
  GroupStanding,
  Match,
  MatchDataProvider,
  MatchStatus,
  StandingRow,
} from './types';

const BASE = 'https://api.football-data.org/v4';

interface FdTeam {
  id: number;
  name: string;
  tla: string; // tre-bokstavskod
  crest: string;
}
interface FdMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED ...
  minute: number | null;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

function mapStatus(s: string): MatchStatus {
  switch (s) {
    case 'SCHEDULED':
    case 'TIMED':
      return 'SCHEDULED';
    case 'IN_PLAY':
    case 'LIVE':
      return 'LIVE';
    case 'PAUSED':
      return 'HALFTIME';
    case 'FINISHED':
      return 'FINISHED';
    case 'POSTPONED':
    case 'SUSPENDED':
      return 'POSTPONED';
    default:
      return 'UNKNOWN';
  }
}

export class FootballDataProvider implements MatchDataProvider {
  readonly name = 'football-data';
  constructor(private token: string) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-Auth-Token': this.token },
    });
    if (!res.ok) {
      throw new Error(`football-data ${path} svarade ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private toMatch(m: FdMatch): Match {
    return {
      id: String(m.id),
      status: mapStatus(m.status),
      minute: m.minute ?? undefined,
      kickoff: m.utcDate,
      home: { id: String(m.homeTeam.id), name: m.homeTeam.name, code: m.homeTeam.tla, crest: m.homeTeam.crest },
      away: { id: String(m.awayTeam.id), name: m.awayTeam.name, code: m.awayTeam.tla, crest: m.awayTeam.crest },
      homeScore: m.score.fullTime.home ?? 0,
      awayScore: m.score.fullTime.away ?? 0,
      stage: m.group ?? m.stage,
      events: [],
    };
  }

  async getFixtures(date?: string): Promise<Match[]> {
    const q = date ? `?dateFrom=${date}&dateTo=${date}` : '';
    const data = await this.get<{ matches: FdMatch[] }>(
      `/competitions/WC/matches${q}`,
    );
    return data.matches.map((m) => this.toMatch(m));
  }

  async getLiveMatches(): Promise<Match[]> {
    const data = await this.get<{ matches: FdMatch[] }>(
      `/competitions/WC/matches?status=LIVE`,
    );
    return data.matches.map((m) => this.toMatch(m));
  }

  async getMatch(id: string): Promise<Match | null> {
    const m = await this.get<FdMatch>(`/matches/${id}`);
    return m ? this.toMatch(m) : null;
  }

  async getStandings(): Promise<GroupStanding[]> {
    interface FdStandingRow {
      position: number;
      team: { id: number; name: string; tla: string; crest: string };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }
    interface FdStanding {
      stage: string;
      group: string | null;
      table: FdStandingRow[];
    }
    const data = await this.get<{ standings: FdStanding[] }>(
      `/competitions/WC/standings`,
    );
    return data.standings
      .filter((s) => s.group) // bara gruppspelstabeller
      .map((s): GroupStanding => ({
        group: s.group ?? 'Grupp',
        rows: s.table.map((r): StandingRow => ({
          team: { id: String(r.team.id), name: r.team.name, code: r.team.tla, crest: r.team.crest },
          rank: r.position,
          played: r.playedGames,
          won: r.won,
          drawn: r.draw,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          goalDiff: r.goalDifference,
          points: r.points,
          qualifies: r.position <= 2,
        })),
      }));
  }

  async getBracket(): Promise<Bracket> {
    // Härled slutspelsträdet från matcher med slutspels-stage.
    const ORDER: { key: string; label: string }[] = [
      { key: 'LAST_16', label: 'Åttondelsfinal' },
      { key: 'QUARTER_FINALS', label: 'Kvartsfinal' },
      { key: 'SEMI_FINALS', label: 'Semifinal' },
      { key: 'THIRD_PLACE', label: 'Bronsmatch' },
      { key: 'FINAL', label: 'Final' },
    ];
    const data = await this.get<{ matches: FdMatch[] }>(
      `/competitions/WC/matches`,
    );
    const rounds = ORDER.map(({ key, label }) => {
      const matches = data.matches
        .filter((m) => m.stage === key)
        .map((m): BracketMatch => {
          const mm = this.toMatch(m);
          return {
            id: mm.id,
            round: label,
            home: mm.home,
            away: mm.away,
            homeScore: mm.status === 'SCHEDULED' ? undefined : mm.homeScore,
            awayScore: mm.status === 'SCHEDULED' ? undefined : mm.awayScore,
            status: mm.status,
            kickoff: mm.kickoff,
          };
        });
      return { round: label, matches };
    }).filter((r) => r.matches.length > 0);
    return { rounds };
  }
}
