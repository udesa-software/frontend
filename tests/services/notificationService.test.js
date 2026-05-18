import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { notificationsApi } from '../../src/api/notifications';
import { navigationRef } from '../../src/navigation/navigationRef';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../src/services/notificationService';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { MAX: 4 },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'mock-project-id',
      },
    },
  },
}));

jest.mock('../../src/api/notifications', () => ({
  notificationsApi: {
    registerToken: jest.fn(),
  },
}));

jest.mock('../../src/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

describe('notificationService', () => {
  const originalPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = originalPlatformOS;
    Device.isDevice = true;
  });

  it('returns null if not a physical device', async () => {
    Device.isDevice = false;
    const token = await registerForPushNotificationsAsync();
    expect(token).toBeNull();
  });

  it('returns null if permissions are denied', async () => {
    Device.isDevice = true;
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    Notifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    
    const token = await registerForPushNotificationsAsync();
    expect(token).toBeNull();
  });

  it('registers successfully on a physical device', async () => {
    Device.isDevice = true;
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[mock]' });
    notificationsApi.registerToken.mockResolvedValueOnce({ status: 'ok' });

    const token = await registerForPushNotificationsAsync();
    expect(token).toBe('ExponentPushToken[mock]');
    expect(notificationsApi.registerToken).toHaveBeenCalledWith('ExponentPushToken[mock]');
  });

  it('configures channel on Android', async () => {
    Platform.OS = 'android';
    Device.isDevice = true;
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[mock]' });
    
    await registerForPushNotificationsAsync();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
  });

  it('logs error and returns token if backend registration fails', async () => {
    Platform.OS = 'ios';
    Device.isDevice = true;
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[mock]' });
    notificationsApi.registerToken.mockRejectedValueOnce(new Error('Backend error'));

    const token = await registerForPushNotificationsAsync();
    expect(token).toBe('ExponentPushToken[mock]');
  });

  it('sets up listeners and handles PendingRequests action when tapped', () => {
    const mockListener = jest.fn();
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((callback) => {
      mockListener.mockImplementation(callback);
      return { remove: jest.fn() };
    });

    navigationRef.isReady.mockReturnValue(true);

    const cleanup = setupNotificationListeners();

    // Trigger listener callback
    mockListener({
      notification: {
        request: {
          content: {
            data: { screen: 'PendingRequests' },
          },
        },
      },
    });

    expect(navigationRef.navigate).toHaveBeenCalledWith('Main', {
      screen: 'Amigos',
      params: { activeTab: 'pending' },
    });

    cleanup();
  });

  it('handles MapFocus action when tapped', () => {
    const mockListener = jest.fn();
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((callback) => {
      mockListener.mockImplementation(callback);
      return { remove: jest.fn() };
    });

    navigationRef.isReady.mockReturnValue(true);

    const cleanup = setupNotificationListeners();

    // Trigger listener callback
    mockListener({
      notification: {
        request: {
          content: {
            data: { screen: 'MapFocus', friendId: 'friend-123' },
          },
        },
      },
    });

    expect(navigationRef.navigate).toHaveBeenCalledWith('Main', {
      screen: 'Mapa',
      params: { focusUserId: 'friend-123' },
    });

    cleanup();
  });

  it('warns if navigation is not ready when responding to notification', () => {
    const mockListener = jest.fn();
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((callback) => {
      mockListener.mockImplementation(callback);
      return { remove: jest.fn() };
    });

    navigationRef.isReady.mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const cleanup = setupNotificationListeners();

    // Trigger listener callback
    mockListener({
      notification: {
        request: {
          content: {
            data: { screen: 'PendingRequests' },
          },
        },
      },
    });

    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
    cleanup();
  });
  it('warns if navigation is not ready when responding to MapFocus notification', () => {
    const mockListener = jest.fn();
    Notifications.addNotificationResponseReceivedListener.mockImplementationOnce((callback) => {
      mockListener.mockImplementation(callback);
      return { remove: jest.fn() };
    });

    navigationRef.isReady.mockReturnValue(false);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const cleanup = setupNotificationListeners();

    mockListener({
      notification: {
        request: {
          content: {
            data: { screen: 'MapFocus', friendId: 'friend-123' },
          },
        },
      },
    });

    expect(navigationRef.navigate).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Navigation router not ready to deep-navigate');
    
    consoleSpy.mockRestore();
    cleanup();
  });

  it('warns if projectId is missing', async () => {
    Device.isDevice = true;
    Notifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    Notifications.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[mock]' });
    notificationsApi.registerToken.mockResolvedValueOnce({ status: 'ok' });

    const Constants = require('expo-constants');
    const originalProjectId = Constants.expoConfig.extra.eas.projectId;
    delete Constants.expoConfig.extra.eas.projectId;

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    await registerForPushNotificationsAsync();
    
    expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] No projectId found in configuration.');
    
    Constants.expoConfig.extra.eas.projectId = originalProjectId;
    consoleSpy.mockRestore();
  });

  it('executes the notification handler correctly', async () => {
    const handlerConfig = Notifications.setNotificationHandler.mock.calls[0][0];
    const result = await handlerConfig.handleNotification();
    expect(result).toEqual({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

});
