/**
 * Notis-logik. Två delar:
 *  1. Behörighet + (valfri) registrering av push-token mot backend.
 *  2. Lokala notiser – appen pollar live-matcher och triggar en notis lokalt
 *     när ett mål upptäcks medan appen är öppen. (Push när appen är stängd
 *     hanteras av server/ som skickar via Expo Push.)
 *
 * Pre-permission priming sker i UI (onboarding) INNAN denna anropas – enligt
 * design-spelboken ger det högre opt-in, särskilt på iOS.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Egen kanal per design-spelboken så användaren kan finjustera i OS.
  await Notifications.setNotificationChannelAsync('goals', {
    name: 'Mål & matchhändelser',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: '#1FE078',
  });
}

/** Begär behörighet. Returnerar true om beviljad. */
export async function requestPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    status = res.status;
  }
  return status === 'granted';
}

/**
 * Hämtar Expo push-token (för att ta emot push från server/ när appen är stängd).
 * Returnerar null på simulator/utan projectId.
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch {
    return null;
  }
}

/** Registrera token hos backend så servern kan pusha till denna enhet. */
export async function registerWithBackend(
  backendUrl: string,
  token: string,
  followedTeams: string[],
): Promise<void> {
  if (!backendUrl) return;
  await fetch(`${backendUrl.replace(/\/$/, '')}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, followedTeams, platform: Platform.OS }),
  });
}

/** Skicka en lokal notis direkt (används av in-app mål-detektion). */
export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: true },
    trigger: null, // direkt
  });
}
