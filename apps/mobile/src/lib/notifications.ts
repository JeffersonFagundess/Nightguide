import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NightEvent } from '@/src/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function prepareNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('eventos', {
      name: 'Eventos salvos',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E2FF54',
    });
  }
}

export async function scheduleEventReminder(event: NightEvent) {
  if (!event.startsAt) return false;

  const eventTime = new Date(event.startsAt).getTime();
  const remindAt = new Date(eventTime - 2 * 60 * 60 * 1000);
  if (!Number.isFinite(eventTime) || remindAt.getTime() <= Date.now()) return false;

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${event.title} começa em 2 horas`,
      body: `${event.venue} • ${event.time}`,
      data: { route: `/event/${event.id}` },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt,
      channelId: 'eventos',
    },
  });
  return true;
}
