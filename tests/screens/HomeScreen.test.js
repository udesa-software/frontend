import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { notificationsApi } from '../../src/api/notifications';

const mockNavigate = jest.fn();

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'mateo', email: 'mateo@test.com' }
  }),
}));

jest.mock('../../src/api/notifications', () => ({
  notificationsApi: {
    getNotifications: jest.fn()
  }
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate
    }),
    useFocusEffect: (cb) => {
      const { useEffect } = require('react');
      useEffect(() => {
        return cb();
      }, [cb]);
    },
  };
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders welcome message with username', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      data: {
        notifications: [
          { id: 1, title: 'Test Notif', body: 'Test body', is_read: true }
        ]
      }
    });

    const { getByText, queryByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('¡Hola, mateo!')).toBeTruthy();
    });

    expect(getByText('mateo@test.com')).toBeTruthy();
    expect(getByText('Bienvenido a UdeSA-migos.')).toBeTruthy();
    expect(queryByTestId('unread-badge')).toBeNull();
  });

  it('shows badge when there are unread notifications', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      data: {
        notifications: [
          { id: 1, title: 'Test Notif', body: 'Test body', is_read: false }
        ]
      }
    });

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId('unread-badge')).toBeTruthy();
    });

    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(1, 20);
  });

  it('navigates to Notifications screen on bell button press', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      data: { notifications: [] }
    });

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalled();
    });

    const bellButton = getByTestId('bell-button');
    fireEvent.press(bellButton);

    expect(mockNavigate).toHaveBeenCalledWith('Notifications');
  });

  it('gracefully handles notification fetch error and logs warning', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    notificationsApi.getNotifications.mockRejectedValue(new Error('API failure'));

    render(<HomeScreen />);

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error checking unread notifications:',
        expect.any(Error)
      );
    });

    consoleWarnSpy.mockRestore();
  });

  it('handles response where notifications are at response.notifications directly', async () => {
    notificationsApi.getNotifications.mockResolvedValue({
      notifications: [
        { id: 1, title: 'Test Notif', body: 'Test body', is_read: false }
      ]
    });

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId('unread-badge')).toBeTruthy();
    });
  });

  it('handles response where notifications are completely missing (fallback to empty array)', async () => {
    notificationsApi.getNotifications.mockResolvedValue({});

    const { queryByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(notificationsApi.getNotifications).toHaveBeenCalled();
    });

    expect(queryByTestId('unread-badge')).toBeNull();
  });
});
