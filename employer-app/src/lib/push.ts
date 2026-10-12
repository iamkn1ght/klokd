/**
 * Push notifications. Registers this phone's Expo push token with the API
 * (POST /me/push-token) once the person is signed in, shows alerts while the
 * app is open, and opens the inbox when an alert is tapped.
 *
 * Everything here is best-effort: Expo Go on Android (SDK 53+) and older
 * installs without the native module can't receive push, and a refusal of
 * permission is respected. In those cases the in-app inbox still has every
 * notification, and the API falls back to SMS/WhatsApp for important ones.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';

type NotificationsModule = typeof import('expo-notifications');

let mod: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
  if (mod !== undefined) return mod;
  try {
    mod = require('expo-notifications') as NotificationsModule;
  } catch {
    mod = null;
  }
  return mod;
}

/** Show alerts as banners even while the app is open. Call once at startup. */
export function configurePushDisplay(): void {
  try {
    notifications()?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // module present but native side missing: nothing to configure
  }
}

const registered = new Set<string>();

/** Ask permission (once) and register this device. Safe to call repeatedly. */
export async function registerForPush(accessToken: string): Promise<void> {
  const n = notifications();
  if (!n || Platform.OS === 'web' || registered.has(accessToken)) return;
  registered.add(accessToken);
  try {
    if (Platform.OS === 'android') {
      await n.setNotificationChannelAsync('default', { name: 'Klokd', importance: n.AndroidImportance.HIGH });
    }
    let { status } = await n.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await n.requestPermissionsAsync());
    if (status !== 'granted') return;
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const { data } = await n.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api('/me/push-token', { method: 'POST', token: accessToken, body: { token: data, platform: Platform.OS } });
  } catch {
    // Push isn't available on this install (see header); the inbox still works.
  }
}

/** Run `onTap` when the person taps a notification. Returns an unsubscribe. */
export function onNotificationTap(onTap: (data: Record<string, unknown>) => void): () => void {
  const n = notifications();
  if (!n) return () => {};
  try {
    const sub = n.addNotificationResponseReceivedListener(r => onTap((r.notification.request.content.data ?? {}) as Record<string, unknown>));
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
