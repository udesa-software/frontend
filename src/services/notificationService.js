import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configuración básica de cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  /**
   * Solicita permisos y obtiene el token de notificaciones de Expo/FCM.
   * @returns {Promise<string|null>} El token o null si falló/fue rechazado.
   */
  registerForPushNotificationsAsync: async () => {
    let token;

    if (!Device.isDevice) {
      console.warn('Las notificaciones push requieren un dispositivo físico.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permiso de notificaciones rechazado.');
      return null;
    }

    try {
      // Necesitas el projectId de EAS para que funcione en SDKs nuevos
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
      
      // getDevicePushTokenAsync obtiene el token NATIVO (FCM en Android, APNs en iOS)
      // Firebase Admin SDK puede manejar ambos si está configurado en la consola.
      const deviceToken = await Notifications.getDevicePushTokenAsync({
        projectId,
      });
      
      token = deviceToken.data;
      console.log('Native Device Token obtenido:', token);
    } catch (e) {
      console.error('Error al obtener el token de notificaciones:', e);
      return null;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  },
};
