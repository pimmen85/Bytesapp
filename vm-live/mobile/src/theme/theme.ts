/**
 * Designsystem för "Mål · VM Live 2026"
 *
 * Bygger på mobil-UI-trender 2026:
 *  - OLED-svart, dark-first (sparar batteri, känns premium, lyfter färgaccenter)
 *  - En tydlig "pitch green" som primärfärg + en pulserande "live"-röd
 *  - Stora, feta rubriker och TABULÄRA siffror för ställning (siffror hoppar inte)
 *  - Mjukt rundade kort, subtil glassmorfism, lugna skuggor
 *  - 8-punkts spacing-skala för konsekvent rytm
 */

export const palette = {
  // Bakgrunder (mörkt -> ljusare yta)
  bg: '#0A0B0D',
  bgElevated: '#121419',
  surface: '#171A21',
  surfaceHi: '#1F232C',
  border: '#262B36',

  // Text
  text: '#F4F6FA',
  textMuted: '#9AA1AE',
  textFaint: '#5E6573',

  // Accentfärger
  pitch: '#1FE078', // primär – plangrön
  pitchDim: '#12A05A', // mörkare grön
  live: '#FF3B5C', // live/mål – röd-rosa
  liveGlow: 'rgba(255,59,92,0.18)',
  gold: '#FFC83D', // gula kort / höjdpunkter
  sky: '#3DA5FF', // info / länkar
  violet: '#9B7BFF',

  // Status
  win: '#1FE078',
  draw: '#9AA1AE',
  loss: '#FF3B5C',

  // Genomskinligt glas
  glass: 'rgba(255,255,255,0.04)',
  glassBorder: 'rgba(255,255,255,0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  x2: 32,
  x3: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  // Tabulära siffror är viktiga för poäng/tid så layouten inte hoppar
  numFamily: 'System',
  display: { fontSize: 34, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
  // OBS: lägg fontVariant: ['tabular-nums'] inline i StyleSheet där score används
  // (kontextuell typ ger rätt FontVariant[]; här skulle 'as const' bli readonly).
  score: { fontSize: 28, fontWeight: '800' as const },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const theme = { palette, spacing, radius, typography, shadow };
export type Theme = typeof theme;
