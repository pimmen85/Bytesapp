/**
 * Ren diff-logik för att upptäcka notisvärda händelser mellan två poll-pass.
 * Hålls fristående och utan sidoeffekter så den är lätt att enhetstesta.
 */

const flagByCode = (code) => {
  if (!code || !/^[A-Za-z]{2}$/.test(code.slice(0, 2))) return '🏳️';
  const a2 = code.slice(0, 2).toUpperCase();
  return String.fromCodePoint(
    ...[...a2].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65)),
  );
};

export function snapshotOf(match) {
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
    redCards: (match.events || []).filter((e) => e.type === 'RED_CARD').length,
  };
}

export function scoreLine(m) {
  const hf = m.home.code ? `${flagByCode(m.home.code)} ` : '';
  const af = m.away.code ? ` ${flagByCode(m.away.code)}` : '';
  return `${hf}${m.home.name} ${m.homeScore}–${m.awayScore} ${m.away.name}${af}`;
}

/**
 * Jämför tidigare snapshot-Map mot nuvarande matcher och returnerar en lista
 * notiser att skicka: [{ type, title, body, matchId, teamIds }].
 * VAR-justeringar (score minskar) hanteras som en korrigeringsnotis.
 */
export function detectNotifications(prevSnapshots, matches) {
  const out = [];
  for (const m of matches) {
    const before = prevSnapshots.get(m.id);
    const now = snapshotOf(m);
    const teamIds = [m.home.id, m.away.id];
    if (!before) continue; // ingen baslinje första passet

    const totalBefore = before.homeScore + before.awayScore;
    const totalNow = now.homeScore + now.awayScore;

    if (totalNow > totalBefore) {
      const scorer = (m.events || []).find((e) =>
        ['GOAL', 'PENALTY_GOAL', 'OWN_GOAL'].includes(e.type),
      );
      const who = scorer?.player
        ? `${scorer.minute ?? ''}' ${scorer.player}`
        : 'Mål!';
      out.push({
        type: 'GOAL',
        title: `⚽ MÅL — ${who}`,
        body: scoreLine(m),
        matchId: m.id,
        teamIds,
      });
    } else if (totalNow < totalBefore) {
      out.push({
        type: 'VAR',
        title: '📺 VAR — mål ändrat',
        body: scoreLine(m),
        matchId: m.id,
        teamIds,
      });
    }

    if (now.redCards > before.redCards) {
      out.push({
        type: 'RED_CARD',
        title: '🟥 Rött kort',
        body: scoreLine(m),
        matchId: m.id,
        teamIds,
      });
    }
    const live = before.status === 'SCHEDULED' &&
      (now.status === 'LIVE' || now.status === 'HALFTIME');
    if (live) {
      out.push({
        type: 'KICKOFF',
        title: '🟢 Avspark',
        body: scoreLine(m),
        matchId: m.id,
        teamIds,
      });
    }
    if (before.status !== 'FINISHED' && now.status === 'FINISHED') {
      out.push({
        type: 'FULLTIME',
        title: '🔔 Slutsignal',
        body: scoreLine(m),
        matchId: m.id,
        teamIds,
      });
    }
  }
  return out;
}

export function buildSnapshotMap(matches) {
  return new Map(matches.map((m) => [m.id, snapshotOf(m)]));
}
