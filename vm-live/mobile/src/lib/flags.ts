/**
 * Landskod -> flagg-emoji. Funkar för ISO-3166 alpha-2 (t.ex. "SE" -> 🇸🇪).
 * Specialfall för hemnationerna (England/Skottland/Wales) som inte har egna alpha-2.
 */
const SPECIAL: Record<string, string> = {
  'GB-ENG': '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'GB-SCT': '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'GB-WLS': '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

export function flagEmoji(code?: string): string {
  if (!code) return '🏳️';
  const upper = code.toUpperCase();
  if (SPECIAL[upper]) return SPECIAL[upper];
  // Bara tvåställig alpha-2 går att mappa till regional indicators.
  const a2 = upper.slice(0, 2);
  if (!/^[A-Z]{2}$/.test(a2)) return '🏳️';
  const codePoints = [...a2].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}
