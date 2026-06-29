import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectNotifications,
  buildSnapshotMap,
  scoreLine,
} from './detector.js';

const base = {
  id: 'm1',
  status: 'LIVE',
  minute: 30,
  home: { id: 'swe', name: 'Sverige', code: 'SE' },
  away: { id: 'esp', name: 'Spanien', code: 'ES' },
  homeScore: 0,
  awayScore: 0,
  events: [],
};

test('första passet ger inga notiser (ingen baslinje)', () => {
  const out = detectNotifications(new Map(), [base]);
  assert.equal(out.length, 0);
});

test('upptäcker ett mål och anger målgöraren', () => {
  const prev = buildSnapshotMap([base]);
  const after = {
    ...base,
    homeScore: 1,
    events: [{ type: 'GOAL', minute: 34, side: 'home', player: 'Isak' }],
  };
  const out = detectNotifications(prev, [after]);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'GOAL');
  assert.match(out[0].title, /Isak/);
  assert.match(out[0].body, /Sverige 1–0 Spanien/);
});

test('VAR som tar bort mål ger korrigeringsnotis', () => {
  const scored = { ...base, homeScore: 1 };
  const prev = buildSnapshotMap([scored]);
  const out = detectNotifications(prev, [{ ...base, homeScore: 0 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'VAR');
});

test('avspark och rött kort detekteras', () => {
  const scheduled = { ...base, status: 'SCHEDULED' };
  const prev = buildSnapshotMap([scheduled]);
  const kicked = {
    ...base,
    status: 'LIVE',
    events: [{ type: 'RED_CARD', minute: 5, side: 'away', player: 'Rodri' }],
  };
  const out = detectNotifications(prev, [kicked]);
  const types = out.map((o) => o.type).sort();
  assert.deepEqual(types, ['KICKOFF', 'RED_CARD']);
});

test('slutsignal detekteras', () => {
  const prev = buildSnapshotMap([base]);
  const out = detectNotifications(prev, [{ ...base, status: 'FINISHED' }]);
  assert.equal(out[0].type, 'FULLTIME');
});

test('scoreLine bygger flaggrad', () => {
  assert.match(scoreLine({ ...base, homeScore: 2, awayScore: 1 }), /Sverige 2–1 Spanien/);
});
