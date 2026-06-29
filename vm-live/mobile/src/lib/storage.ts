/**
 * Lagring av användarens inställningar och följda lag (AsyncStorage).
 * Granulära notistoggles enligt design-spelboken (separat per händelsetyp).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  enabled: boolean;
  goals: boolean;
  matchStart: boolean;
  fullTime: boolean;
  redCards: boolean;
  /** Notisa endast för följda lag (annars alla matcher) */
  onlyFollowed: boolean;
}

export const defaultSettings: NotificationSettings = {
  enabled: false,
  goals: true,
  matchStart: true,
  fullTime: true,
  redCards: true,
  onlyFollowed: false,
};

const SETTINGS_KEY = 'mal:settings';
const FOLLOWED_KEY = 'mal:followed';

export async function loadSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(s: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export async function loadFollowed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FOLLOWED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFollowed(teamId: string): Promise<string[]> {
  const current = await loadFollowed();
  const next = current.includes(teamId)
    ? current.filter((id) => id !== teamId)
    : [...current, teamId];
  await AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(next));
  return next;
}
