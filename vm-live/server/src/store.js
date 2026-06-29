/**
 * Enkel JSON-fil-lagring av registrerade enheter (push-token + följda lag).
 * Räcker för en solo-app; byt till Redis/Postgres när det skalar.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'devices.json');

let devices = new Map();

function persist() {
  writeFileSync(FILE, JSON.stringify([...devices.values()], null, 2));
}

export function loadStore() {
  if (existsSync(FILE)) {
    try {
      const arr = JSON.parse(readFileSync(FILE, 'utf8'));
      devices = new Map(arr.map((d) => [d.token, d]));
    } catch {
      devices = new Map();
    }
  }
}

export function upsertDevice({ token, followedTeams = [], platform = 'unknown' }) {
  if (!token) return;
  devices.set(token, { token, followedTeams, platform });
  persist();
}

export function removeDevice(token) {
  if (devices.delete(token)) persist();
}

/**
 * Returnerar tokens som ska få en notis givet onlyFollowed-semantik.
 * Här: en enhet får notisen om den inte följer några lag (vill ha allt),
 * eller om något av matchens lag finns i dess följda lag.
 */
export function tokensForTeams(teamIds) {
  const out = [];
  for (const d of devices.values()) {
    if (!d.followedTeams || d.followedTeams.length === 0) {
      out.push(d.token);
    } else if (d.followedTeams.some((id) => teamIds.includes(id))) {
      out.push(d.token);
    }
  }
  return out;
}

export function deviceCount() {
  return devices.size;
}
