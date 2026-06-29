/**
 * Mål · VM Live – backend.
 *  - REST: /register (enhet + följda lag), /unregister, /health
 *  - Poll-loop: hämtar live-matcher, diffar mot förra passet, skickar Expo-push
 *    för mål/rött kort/avspark/slutsignal till relevanta enheter (dedupat).
 *
 * Strategi enligt API-RESEARCH.md: snabb-polla live var 15:e s, idle var 60:e s.
 */
import express from 'express';
import { createProvider } from './providers.js';
import {
  detectNotifications,
  buildSnapshotMap,
  snapshotOf,
} from './detector.js';
import { sendPush } from './push.js';
import {
  loadStore,
  upsertDevice,
  removeDevice,
  tokensForTeams,
  deviceCount,
  allTokens,
} from './store.js';

const PORT = process.env.PORT || 4000;
const LIVE_POLL_MS = Number(process.env.LIVE_POLL_MS || 15_000);
const IDLE_POLL_MS = Number(process.env.IDLE_POLL_MS || 60_000);

const provider = createProvider();
loadStore();

// Senast kända snapshot per match + redan skickade notis-nycklar (idempotens).
let snapshots = new Map();
const sentKeys = new Set();

function notifKey(n) {
  // En notis per (match, typ, ställning) skickas bara en gång.
  return `${n.matchId}:${n.type}:${n.body}`;
}

async function pollOnce() {
  let live = [];
  try {
    live = await provider.getLiveMatches();
  } catch (err) {
    console.error('[poll] kunde inte hämta live-matcher:', err.message);
    return { anyLive: false };
  }

  // Berika med events där providern stödjer det (för korrekt målgörare).
  for (const m of live) {
    if (typeof provider.getEvents === 'function') {
      try {
        m.events = await provider.getEvents(m.id, m);
      } catch {
        /* events är best-effort */
      }
    }
  }

  const notifications = detectNotifications(snapshots, live);
  for (const n of notifications) {
    const key = notifKey(n);
    if (sentKeys.has(key)) continue;
    sentKeys.add(key);
    const tokens = tokensForTeams(n.teamIds);
    const { sent } = await sendPush(tokens, {
      title: n.title,
      body: n.body,
      data: { matchId: n.matchId, type: n.type },
    });
    console.log(`[push] ${n.type} "${n.title}" -> ${sent}/${tokens.length} enheter`);
  }

  // Uppdatera snapshots (behåll avslutade matchers sista läge en stund inte nödvändigt).
  for (const m of live) snapshots.set(m.id, snapshotOf(m));
  const anyLive = live.some(
    (m) => m.status === 'LIVE' || m.status === 'HALFTIME',
  );
  return { anyLive };
}

async function loop() {
  const { anyLive } = await pollOnce();
  setTimeout(loop, anyLive ? LIVE_POLL_MS : IDLE_POLL_MS);
}

// --- HTTP API ---------------------------------------------------------------
const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    provider: provider.name,
    devices: deviceCount(),
    trackedMatches: snapshots.size,
  });
});

app.post('/register', (req, res) => {
  const { token, followedTeams, platform } = req.body || {};
  if (!token || !String(token).startsWith('ExponentPushToken')) {
    return res.status(400).json({ error: 'ogiltig push-token' });
  }
  upsertDevice({ token, followedTeams, platform });
  res.json({ ok: true, devices: deviceCount() });
});

app.post('/unregister', (req, res) => {
  const { token } = req.body || {};
  removeDevice(token);
  res.json({ ok: true, devices: deviceCount() });
});

/**
 * Skicka en testnotis till alla registrerade enheter. Praktiskt för att
 * verifiera att riktig push fungerar end-to-end: curl -X POST .../push/test
 */
app.post('/push/test', async (req, res) => {
  const tokens = allTokens();
  const { sent } = await sendPush(tokens, {
    title: req.body?.title || '⚽ Testnotis',
    body: req.body?.body || 'Push fungerar! 🇸🇪 Sverige 2–1 Spanien 🇪🇸',
    data: { type: 'TEST' },
  });
  res.json({ ok: true, devices: tokens.length, sent });
});

app.listen(PORT, () => {
  console.log(`Mål · VM Live backend på :${PORT} (provider: ${provider.name})`);
  loop();
});
