import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let configured = false;
let permissionRequested = false;

export async function notifyAchievementUnlocked(title: string, description: string) {
  try {
    await ensureNotificationsConfigured();
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🏆 Conquista desbloqueada: ${title}`,
        body: description,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' ? { channelId: 'achievements' } : {}),
      },
      trigger: null,
    });
  } catch {}
}

async function ensureNotificationsConfigured() {
  if (!configured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    configured = true;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Conquistas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}
