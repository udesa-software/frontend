import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { notificationsApi } from '../api/notifications';
import { navigationRef } from '../navigation/navigationRef';
import appConfig from '../../app.json';

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use a physical device to receive push notifications in Expo Go');
    return null;
  }

  // 1. Check & Request Perms
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permissions denied');
    return null;
  }

  // 2. Fetch Expo Push Token for Expo Go
  const projectId =
    appConfig?.expo?.extra?.eas?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[NotificationService] No projectId found in configuration.');
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId,
  });
  const token = tokenData.data;
  console.log('Expo Push Token retrieved:', token);

  // 3. Android specific setup channel import
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 4. Register with backend
  try {
    await notificationsApi.registerToken(token);
    console.log('Token successfully registered on backend');
  } catch (err) {
    console.error('Failed to register token with backend:', err.message);
  }

  return token;
}

// Configures the notification response listener (tap event)
export function setupNotificationListeners() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    // Extract screen navigation data
    const data = response.notification.request.content.data;
    console.log('Notification tapped, payload data:', data);

    if (data && data.screen === 'PendingRequests') {
      // CA.2: Open directly in pending requests
      if (navigationRef.isReady()) {
        navigationRef.navigate('Main', {
          screen: 'Amigos',
          params: { activeTab: 'pending' },
        });
      } else {
        console.warn('[NotificationService] Navigation router not ready to deep-navigate');
      }
    }
  });

  return () => subscription.remove();
}
