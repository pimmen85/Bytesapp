/**
 * Pollar matchdata och upptäcker mål/händelser medan appen är öppen.
 * Strategin följer API-RESEARCH.md: polla live var ~15:e s, diffa score,
 * dedupa per match, och trigga en lokal notis vid nytt mål/rött kort/start/slut.
 *
 * (Push när appen är STÄNGD sköts av server/ – detta är "appen-i-förgrunden"-fallet.)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getProvider } from '../api';
import type { Match } from '../api/types';
import { isLive } from '../api/types';
import { flagEmoji } from './flags';
import { presentLocalNotification } from './notifications';
import {
  loadFollowed,
  loadSettings,
  type NotificationSettings,
} from './storage';

const LIVE_POLL_MS = 15_000; // matchar API-Football-kadensen
const IDLE_POLL_MS = 60_000; // när inget är live

interface Snapshot {
  homeScore: number;
  awayScore: number;
  status: Match['status'];
  redCards: number;
}

function snapshotOf(m: Match): Snapshot {
  return {
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    redCards: m.events.filter((e) => e.type === 'RED_CARD').length,
  };
}

function teamFollowed(m: Match, followed: string[]): boolean {
  return followed.includes(m.home.id) || followed.includes(m.away.id);
}

function scoreLine(m: Match): string {
  return `${flagEmoji(m.home.code)} ${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name} ${flagEmoji(m.away.code)}`;
}

/**
 * Jämför nytt och gammalt snapshot och skickar relevanta lokala notiser
 * utifrån användarens granulära inställningar.
 */
async function notifyDiffs(
  prev: Map<string, Snapshot>,
  matches: Match[],
  settings: NotificationSettings,
  followed: string[],
): Promise<void> {
  if (!settings.enabled) return;
  for (const m of matches) {
    const before = prev.get(m.id);
    const now = snapshotOf(m);
    if (settings.onlyFollowed && !teamFollowed(m, followed)) continue;
    if (!before) continue; // första passet: ingen baslinje att diffa mot

    const totalBefore = before.homeScore + before.awayScore;
    const totalNow = now.homeScore + now.awayScore;

    if (settings.goals && totalNow > totalBefore) {
      const scorer = m.events.find(
        (e) => e.type === 'GOAL' || e.type === 'PENALTY_GOAL' || e.type === 'OWN_GOAL',
      );
      const who = scorer?.player ? `${scorer.minute ?? ''}' ${scorer.player}` : 'Mål!';
      await presentLocalNotification(`⚽ MÅL — ${who}`, scoreLine(m), {
        matchId: m.id,
      });
    }
    if (settings.redCards && now.redCards > before.redCards) {
      await presentLocalNotification('🟥 Rött kort', scoreLine(m), {
        matchId: m.id,
      });
    }
    if (
      settings.matchStart &&
      before.status === 'SCHEDULED' &&
      isLive(now.status)
    ) {
      await presentLocalNotification('🟢 Avspark', scoreLine(m), {
        matchId: m.id,
      });
    }
    if (
      settings.fullTime &&
      before.status !== 'FINISHED' &&
      now.status === 'FINISHED'
    ) {
      await presentLocalNotification('🔔 Slutsignal', scoreLine(m), {
        matchId: m.id,
      });
    }
  }
}

export interface UseMatchesResult {
  matches: Match[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMatches(): UseMatchesResult {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const snapshots = useRef<Map<string, Snapshot>>(new Map());

  const tick = useCallback(async () => {
    try {
      const provider = getProvider();
      const data = await provider.getFixtures();
      const [settings, followed] = await Promise.all([
        loadSettings(),
        loadFollowed(),
      ]);
      await notifyDiffs(snapshots.current, data, settings, followed);
      snapshots.current = new Map(data.map((m) => [m.id, snapshotOf(m)]));
      setMatches(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunde inte hämta matcher');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const loop = async () => {
      if (!active) return;
      await tick();
      const anyLive = snapshots.current
        ? [...snapshots.current.values()].some((s) => isLive(s.status))
        : false;
      timer = setTimeout(loop, anyLive ? LIVE_POLL_MS : IDLE_POLL_MS);
    };
    loop();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tick]);

  return { matches, loading, error, refresh: tick };
}
