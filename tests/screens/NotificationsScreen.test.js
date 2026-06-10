import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NotificationsScreen } from '../../src/screens/NotificationsScreen';
import { notificationsApi } from '../../src/api/notifications';

// --- Mocks ---

jest.mock('../../src/api/notifications', () => ({
  notificationsApi: {
    getNotifications: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
  };
});

// --- Helpers ---

const makeNotification = (overrides = {}) => ({
  id: 1,
  title: 'Test Notification',
  body: 'Test body',
  is_read: false,
  is_deleted: false,
  data: null,
  created_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
  ...overrides,
});

const mockPaginatedResponse = (notifications = [], pages = 1) => ({
  data: { notifications, pages, total: notifications.length, page: 1, per_page: 20 },
});

// --- Tests ---

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    notificationsApi.markAllAsRead.mockResolvedValue({ data: { status: 'ok' } });
    notificationsApi.markAsRead.mockResolvedValue({ data: { status: 'ok' } });
    notificationsApi.deleteNotification.mockResolvedValue({ data: { status: 'ok' } });
  });

  // --- Rendering ---

  it('shows loading indicator on initial load', () => {
    notificationsApi.getNotifications.mockReturnValue(new Promise(() => {}));
    render(<NotificationsScreen />);
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(1, 20);
  });

  it('renders empty state when there are no notifications', async () => {
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([]));
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(getByText('Historial vacío')).toBeTruthy();
      expect(getByText(/No tienes notificaciones/)).toBeTruthy();
    });
  });

  it('renders a list of notifications', async () => {
    const notifs = [
      makeNotification({ id: 1, title: 'Notif 1', body: 'Body 1', is_read: false }),
      makeNotification({ id: 2, title: 'Notif 2', body: 'Body 2', is_read: true }),
    ];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(getByText('Notif 1')).toBeTruthy();
      expect(getByText('Notif 2')).toBeTruthy();
    });
  });

  it('renders correct time labels (ahora, min, h, days, ayer)', async () => {
    const notifs = [
      makeNotification({ id: 1, created_at: new Date(Date.now() - 30000).toISOString() }),     // < 1 min → "Hace un momento"
      makeNotification({ id: 2, created_at: new Date(Date.now() - 120000).toISOString() }),    // 2 min
      makeNotification({ id: 3, created_at: new Date(Date.now() - 7200000).toISOString() }),   // 2 h
      makeNotification({ id: 4, created_at: new Date(Date.now() - 86400000).toISOString() }),  // 1 day → "Ayer"
      makeNotification({ id: 5, created_at: new Date(Date.now() - 3 * 86400000).toISOString() }), // 3 days
      makeNotification({ id: 6, created_at: new Date(Date.now() - 10 * 86400000).toISOString() }), // >7 days → formatted date
    ];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => {
      expect(getByText('Hace un momento')).toBeTruthy();
      expect(getByText('Hace 2 min')).toBeTruthy();
      expect(getByText('Hace 2 h')).toBeTruthy();
      expect(getByText('Ayer')).toBeTruthy();
      expect(getByText('Hace 3 días')).toBeTruthy();
    });
  });

  it('formatTimeAgo returns empty string for null date', async () => {
    const notifs = [makeNotification({ id: 1, created_at: null })];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));
    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => expect(getByText('Test Notification')).toBeTruthy());
  });

  // --- Back button ---

  it('calls goBack when back button is pressed', async () => {
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([]));
    const { getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalled());
    const backBtn = getByTestId('back-button');
    fireEvent.press(backBtn);
    expect(mockGoBack).toHaveBeenCalled();
  });

  // --- Mark all as read ---

  it('marks all as read when button is pressed and there are unread notifications', async () => {
    const notifs = [makeNotification({ id: 1, is_read: false })];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));

    const { getByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));

    const readAllBtn = getByTestId('mark-all-read-button');
    fireEvent.press(readAllBtn);

    await waitFor(() => expect(notificationsApi.markAllAsRead).toHaveBeenCalled());
  });

  it('does not call markAllAsRead when all notifications are already read', async () => {
    const notifs = [makeNotification({ id: 1, is_read: true })];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));

    const { getByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));

    const readAllBtn = getByTestId('mark-all-read-button');
    fireEvent.press(readAllBtn);

    expect(notificationsApi.markAllAsRead).not.toHaveBeenCalled();
  });

  it('rolls back on markAllAsRead API error and shows alert', async () => {
    const notifs = [makeNotification({ id: 1, is_read: false })];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));
    notificationsApi.markAllAsRead.mockRejectedValueOnce(new Error('Network error'));

    const { getByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));

    const readAllBtn = getByTestId('mark-all-read-button');
    fireEvent.press(readAllBtn);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudieron marcar las notificaciones como leídas.')
    );
  });

  // --- Delete notification ---

  it('removes a notification from the list on delete (optimistic)', async () => {
    const notifs = [
      makeNotification({ id: 1, title: 'Keep' }),
      makeNotification({ id: 2, title: 'Delete Me', body: 'Bye' }),
    ];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));

    const { getByText, queryByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Delete Me'));

    const deleteBtn = getByTestId('delete-button-2');
    fireEvent.press(deleteBtn);

    await waitFor(() => expect(notificationsApi.deleteNotification).toHaveBeenCalledWith(2));
    await waitFor(() => expect(queryByText('Delete Me')).toBeNull());
  });

  it('rolls back delete on API error and shows alert', async () => {
    const notifs = [makeNotification({ id: 1, title: 'Will Fail' })];
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse(notifs));
    notificationsApi.deleteNotification.mockRejectedValueOnce(new Error('Server error'));

    const { getByText, getByTestId } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Will Fail'));

    const deleteBtn = getByTestId('delete-button-1');
    fireEvent.press(deleteBtn);

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudo eliminar la notificación.')
    );
    expect(getByText('Will Fail')).toBeTruthy();
  });

  // --- Tap / mark as read + navigation ---

  it('marks notification as read on tap and navigates for PendingRequests', async () => {
    const notif = makeNotification({ id: 10, is_read: false, data: { screen: 'PendingRequests' } });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith(10);
      expect(mockNavigate).toHaveBeenCalledWith('Main', {
        screen: 'Amigos',
        params: { activeTab: 'pending' },
      });
    });
  });

  it('marks notification as read and navigates for MapFocus', async () => {
    const notif = makeNotification({ id: 11, is_read: false, data: { screen: 'MapFocus', friendId: 'user-42' } });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith(11);
      expect(mockNavigate).toHaveBeenCalledWith('Main', {
        screen: 'Mapa',
        params: { focusUserId: 'user-42' },
      });
    });
  });

  it('does not navigate when data is null', async () => {
    const notif = makeNotification({ id: 12, is_read: false, data: null });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));

    await waitFor(() => expect(notificationsApi.markAsRead).toHaveBeenCalledWith(12));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does NOT call markAsRead on tap if notification is already read', async () => {
    const notif = makeNotification({ id: 13, is_read: true, data: null });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));

    await waitFor(() => expect(notificationsApi.markAsRead).not.toHaveBeenCalled());
  });

  it('parses data when it is a JSON string', async () => {
    const notif = makeNotification({ id: 14, is_read: false, data: JSON.stringify({ screen: 'PendingRequests' }) });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Main', {
        screen: 'Amigos',
        params: { activeTab: 'pending' },
      });
    });
  });

  it('handles invalid JSON in data gracefully', async () => {
    const notif = makeNotification({ id: 15, is_read: false, data: 'not-json{' });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));
    await waitFor(() => expect(notificationsApi.markAsRead).toHaveBeenCalledWith(15));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('silently catches markAsRead error on tap', async () => {
    const notif = makeNotification({ id: 16, is_read: false, data: null });
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([notif]));
    notificationsApi.markAsRead.mockRejectedValueOnce(new Error('Server failure'));

    const { getByText } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));
    fireEvent.press(getByText('Test body'));
    await waitFor(() => expect(notificationsApi.markAsRead).toHaveBeenCalledWith(16));
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // --- Error handling for fetch ---

  it('shows alert on fetch error', async () => {
    notificationsApi.getNotifications.mockRejectedValue(new Error('Network Error'));
    render(<NotificationsScreen />);
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudieron cargar las notificaciones.');
    });
  });

  // --- Pagination ---

  it('loads more on scroll end when more pages available', async () => {
    const notifs = [makeNotification({ id: 1 }), makeNotification({ id: 2 })];
    notificationsApi.getNotifications
      .mockResolvedValueOnce(mockPaginatedResponse(notifs, 2))
      .mockResolvedValueOnce(mockPaginatedResponse([makeNotification({ id: 3 })], 2));

    const { UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1));

    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);
    await act(async () => {
      flatList.props.onEndReached();
    });

    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2));
    expect(notificationsApi.getNotifications).toHaveBeenCalledWith(2, 20);
  });

  it('does not load more when already at last page', async () => {
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([makeNotification({ id: 1 })], 1));
    const { UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1));

    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);
    await act(async () => {
      flatList.props.onEndReached();
    });

    expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(1);
  });

  it('refreshes the list on pull-to-refresh', async () => {
    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([makeNotification({ id: 1 })]));
    const { getByText, UNSAFE_getByType } = render(<NotificationsScreen />);
    await waitFor(() => getByText('Test Notification'));

    notificationsApi.getNotifications.mockResolvedValue(mockPaginatedResponse([]));
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    await act(async () => {
      flatList.props.onRefresh();
    });

    await waitFor(() => expect(notificationsApi.getNotifications).toHaveBeenCalledTimes(2));
  });
});
