/**
 * Skickar notiser via Expo Push API (https://docs.expo.dev/push-notifications/sending-notifications/).
 * Inget SDK-beroende – vi POSTar direkt. Batchar upp till 100 meddelanden per anrop.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @param {string[]} tokens  Expo push-tokens (ExponentPushToken[...])
 * @param {{title:string, body:string, data?:object, channelId?:string}} message
 */
export async function sendPush(tokens, message) {
  const valid = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return { sent: 0 };

  let sent = 0;
  for (const batch of chunk(valid, 100)) {
    const payload = batch.map((to) => ({
      to,
      sound: 'default',
      priority: 'high',
      channelId: message.channelId || 'goals',
      title: message.title,
      body: message.body,
      data: message.data || {},
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) sent += batch.length;
      else console.error('[push] Expo svarade', res.status, await res.text());
    } catch (err) {
      console.error('[push] fel vid sändning:', err.message);
    }
  }
  return { sent };
}
