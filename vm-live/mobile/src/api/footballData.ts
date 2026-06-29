/**
 * football-data.org – gratis fallback (kod "WC", auth header X-Auth-Token).
 * Ger score/fixtures/standings men en lättare event-feed än API-Football.
 *
 * Endpoints:
 *   GET /v4/competitions/WC/matches                – alla VM-matcher
 *   GET /v4/competitions/WC/matches?status=LIVE    – pågående
 *   GET /v4/matches/{id}                           – matchdetalj
 */
import type { Match, MatchDataProvider, MatchStatus } from './types';

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
}
