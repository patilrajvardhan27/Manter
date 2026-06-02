import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { api } from '../lib/api';

// How to handle notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(isAuthenticated: boolean) {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!isAuthenticated) return;

    registerAndUploadToken();

    // Foreground notification display
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification is shown automatically via setNotificationHandler above
      },
    );

    // Tap on notification → navigate to the right screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string>;
        handleNotificationTap(data);
      },
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated]);
}

async function registerAndUploadToken() {
  if (Platform.OS === 'web') return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await api.post('/users/me/push-token', { token: tokenData.data });
  } catch {
    // Silent — push is optional
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('safety', {
      name: 'Safety Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });
  }
}

function handleNotificationTap(data: Record<string, string>) {
  if (!data?.screen) return;

  switch (data.screen) {
    case 'chat':
      if (data.matchId) {
        router.push({ pathname: '/(tabs)/chat/[matchId]', params: { matchId: data.matchId } });
      }
      break;
    case 'matches':
      router.push('/(tabs)/matches');
      break;
    case 'profile':
      router.push('/(tabs)/profile');
      break;
    default:
      router.push('/(tabs)/discover');
  }
}
