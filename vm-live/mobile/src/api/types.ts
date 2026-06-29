/**
 * Delade datatyper för matchdata. Normaliserad form som UI:t använder,
 * oberoende av vilket API (API-Football, football-data.org, mock) som ligger bakom.
 */

export type MatchStatus =
  | 'SCHEDULED' // ej startad
  | 'LIVE' // pågår (1:a/2:a halvlek, förlängning)
  | 'HALFTIME' // paus
  | 'FINISHED' // slutsignal
  | 'POSTPONED'
  | 'UNKNOWN';

export type MatchEventType =
  | 'GOAL'
  | 'OWN_GOAL'
  | 'PENALTY_GOAL'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'SUBSTITUTION'
  | 'VAR'
  | 'KICKOFF'
  | 'HALFTIME'
  | 'FULLTIME';

export interface Team {
  id: string;
  name: string;
  /** ISO-3166 alpha-2/3 eller landskod – används för flagg-emoji */
  code?: string;
  crest?: string; // logga-URL om tillgänglig
}

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute?: number;
  /** Vilket lag händelsen gäller ('home' | 'away') */
  side?: 'home' | 'away';
  player?: string;
  assist?: string;
  detail?: string;
}

export interface Match {
  id: string;
  status: MatchStatus;
  /** Speltminut för live-matcher, t.ex. 67 */
  minute?: number;
  /** ISO-tid för avspark */
  kickoff: string;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  /** Gruppspel ("Group A") eller slutspelsrunda ("Round of 16") */
  stage?: string;
  venue?: string;
  events: MatchEvent[];
}

/** Provider-kontraktet. Alla datakällor implementerar detta. */
export interface MatchDataProvider {
  readonly name: string;
  /** Alla VM-matcher (schema), valfritt filtrerat på datum (YYYY-MM-DD). */
  getFixtures(date?: string): Promise<Match[]>;
  /** Endast pågående matcher – billig, anropas ofta. */
  getLiveMatches(): Promise<Match[]>;
  /** En matchs fulla detalj inkl. tidslinje. */
  getMatch(id: string): Promise<Match | null>;
}

export function isLive(status: MatchStatus): boolean {
  return status === 'LIVE' || status === 'HALFTIME';
}
