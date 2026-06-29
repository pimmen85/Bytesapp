/**
 * MockProvider – simulerar VM-matcher utan API-nyckel.
 * Perfekt för utveckling och demo: en match är "live" och får mål över tid
 * så att man kan se livescore-UI och testa mål-notiser direkt.
 */
import type { Match, MatchDataProvider, MatchEvent } from './types';

// Fast referenstid så mock-datan är deterministisk i en session.
const now = Date.now();
const min = (m: number) => new Date(now + m * 60_000).toISOString();

function ev(
  id: string,
  type: MatchEvent['type'],
  minute: number,
  side: 'home' | 'away',
  player: string,
  detail?: string,
): MatchEvent {
  return { id, type, minute, side, player, detail };
}

/**
 * Live-matchen byggs dynamiskt utifrån hur länge sedan "avspark" var,
 * så att score och minut tickar uppåt medan appen är öppen.
 */
function buildLiveMatch(startedAtMs: number): Match {
  const elapsedMin = Math.floor((Date.now() - startedAtMs) / 60_000);
  const minute = Math.min(Math.max(elapsedMin, 1), 90);

  // Mål-schema: minut -> händelse. Avslöjas allt eftersom minuten passeras.
  const goalScript: Array<{ at: number; e: MatchEvent }> = [
    { at: 1, e: ev('e0', 'KICKOFF', 0, 'home', '') },
    { at: 12, e: ev('e1', 'GOAL', 12, 'home', 'Gyökeres', 'Skott i nät') },
    { at: 23, e: ev('e2', 'YELLOW_CARD', 23, 'away', 'Rodri') },
    { at: 34, e: ev('e3', 'GOAL', 34, 'away', 'Yamal', 'Straff') },
    { at: 45, e: ev('e4', 'HALFTIME', 45, 'home', '') },
    { at: 58, e: ev('e5', 'GOAL', 58, 'home', 'Isak', 'Nick') },
    { at: 71, e: ev('e6', 'RED_CARD', 71, 'away', 'Le Normand') },
    { at: 83, e: ev('e7', 'GOAL', 83, 'home', 'Gyökeres', 'Kontring') },
  ];

  const events = goalScript.filter((g) => g.at <= minute).map((g) => g.e);
  const homeScore = events.filter(
    (e) => e.side === 'home' && (e.type === 'GOAL' || e.type === 'PENALTY_GOAL'),
  ).length;
  const awayScore = events.filter(
    (e) => e.side === 'away' && (e.type === 'GOAL' || e.type === 'PENALTY_GOAL'),
  ).length;

  const atHalftime = minute >= 45 && minute < 47;

  return {
    id: 'm-live-1',
    status: atHalftime ? 'HALFTIME' : 'LIVE',
    minute,
    kickoff: new Date(startedAtMs).toISOString(),
    home: { id: 'swe', name: 'Sverige', code: 'SE' },
    away: { id: 'esp', name: 'Spanien', code: 'ES' },
    homeScore,
    awayScore,
    stage: 'Åttondelsfinal',
    venue: 'MetLife Stadium, New Jersey',
    events: [...events].reverse(), // nyaste först
  };
}

const upcoming: Match[] = [
  {
    id: 'm-2',
    status: 'SCHEDULED',
    kickoff: min(75),
    home: { id: 'bra', name: 'Brasilien', code: 'BR' },
    away: { id: 'arg', name: 'Argentina', code: 'AR' },
    homeScore: 0,
    awayScore: 0,
    stage: 'Åttondelsfinal',
    venue: 'SoFi Stadium, Los Angeles',
    events: [],
  },
  {
    id: 'm-3',
    status: 'SCHEDULED',
    kickoff: min(180),
    home: { id: 'fra', name: 'Frankrike', code: 'FR' },
    away: { id: 'eng', name: 'England', code: 'GB-ENG' },
    homeScore: 0,
    awayScore: 0,
    stage: 'Åttondelsfinal',
    venue: 'AT&T Stadium, Dallas',
    events: [],
  },
];

const finished: Match[] = [
  {
    id: 'm-0',
    status: 'FINISHED',
    minute: 90,
    kickoff: min(-150),
    home: { id: 'ned', name: 'Nederländerna', code: 'NL' },
    away: { id: 'usa', name: 'USA', code: 'US' },
    homeScore: 2,
    awayScore: 1,
    stage: 'Åttondelsfinal',
    venue: 'Mercedes-Benz Stadium, Atlanta',
    events: [
      ev('f1', 'GOAL', 9, 'home', 'Gakpo'),
      ev('f2', 'GOAL', 47, 'away', 'Pulisic'),
      ev('f3', 'GOAL', 81, 'home', 'Depay'),
    ].reverse(),
  },
];

// Avspark för live-matchen: ~40 min sedan, så den är mitt i andra halvlek.
const liveStart = now - 40 * 60_000;

export class MockProvider implements MatchDataProvider {
  readonly name = 'mock';

  async getFixtures(): Promise<Match[]> {
    const live = buildLiveMatch(liveStart);
    return [live, ...upcoming, ...finished];
  }

  async getLiveMatches(): Promise<Match[]> {
    return [buildLiveMatch(liveStart)];
  }

  async getMatch(id: string): Promise<Match | null> {
    const all = await this.getFixtures();
    return all.find((m) => m.id === id) ?? null;
  }
}
