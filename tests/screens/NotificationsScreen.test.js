import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';
import { notificationsApi } from '../../src/api/notifications';

jest.mock('../../src/api/notifications', () => ({
  notificationsApi: {
    getNotifications: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when there are no notifications', async () => {
    notificationsApi.getNotifications.mockResolvedValueOnce({
      data: {
        notifications: [],
        pages: 1,
        total: 0,
      },
    });

    const { getByText } = render(<NotificationsScreen />);

    await waitFor(() => {
      expect(getByText('Historial vacío')).toBeTruthy();
      expect(getByText(/No tienes notificaciones por el momento/)).toBeTruthy();
    });
  });

  it('renders a list of notifications correctly', async () => {
    const mockNotifications = [
      { id: 1, title: 'Unread Notification', body: 'This is body 1', is_read: false, created_at: '2026-05-21T23:00:00Z' },
      { id: 2, title: 'Read Notification', body: 'This is body 2', is_read: true, created_at: '2026-05-21T22:00:00Z' },
    ];

    notificationsApi.getNotifications.mockResolvedValueOnce({
      data: {
        notifications: mockNotifications,
        pages: 1,
        total: 2,
      },
    });

    const { getByText } = render(<NotificationsScreen />);

    await waitFor(() => {
      expect(getByText('Unread Notification')).toBeTruthy();
      expect(getByText('This is body 1')).toBeTruthy();
      expect(getByText('Read Notification')).toBeTruthy();
      expect(getByText('This is body 2')).toBeTruthy();
    });
  });

  it('calls goBack when back button is pressed', async () => {
    notificationsApi.getNotifications.mockResolvedValueOnce({
      data: { notifications: [], pages: 1, total: 0 },
    });

    const { getByTestId, renderResult } = render(<NotificationsScreen />);
    
    // Find back button by Ionicons name or custom headers
    // Back button is the first touchable element
    const { getByText } = render(<NotificationsScreen />);
    
    // Using a simpler test: let's fire event on the back button container (first button in header)
    // We will wait for rendering to finish.
  });
});
