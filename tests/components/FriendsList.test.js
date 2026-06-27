import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FriendsList } from '../../src/components/FriendsList';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { friendsApi } from '../../src/api/friends';
import { getFriendsLocations } from '../../src/api/location';

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getFriendsList: jest.fn(),
    removeFriend: jest.fn(),
  }
}));

jest.mock('../../src/api/location', () => ({
  getFriendsLocations: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 }
}));

describe('FriendsList', () => {
  const mockOnGoToSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    friendsApi.getFriendsList.mockReturnValue(new Promise(() => {})); // pending promise
    const { getByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    // Note: ActivityIndicator might not be immediately visible due to ListFooterComponent logic, 
    // but we can check if fetch was called.
    expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
  });

  it('renders empty state when no friends are returned', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({ data: { data: [], pagination: { page: 1, totalPages: 1 } } });
    
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => {
      expect(getByText('¡Aún no tenés amigos!')).toBeTruthy();
    });

    // Press the button to go to search
    fireEvent.press(getByText('Buscar Amigos'));
    expect(mockOnGoToSearch).toHaveBeenCalled();
  });

  it('renders list of friends', async () => {
    const mockFriends = [
      { friend_id: 1, friend_username: 'testuser1' },
      { friend_id: 2, friend_username: 'testuser2' },
    ];

    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: mockFriends, pagination: { page: 1, totalPages: 1 } } 
    });

    const { getByText, queryByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    await waitFor(() => {
      expect(getByText('testuser1')).toBeTruthy();
      expect(getByText('testuser2')).toBeTruthy();
    });

    expect(queryByText('¡Aún no tenés amigos!')).toBeNull();
  });

  it('changes sort mode to proximity, requests location and fetches from locations service', async () => {
    // Initial fetch
    friendsApi.getFriendsList.mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });

    const { getByText, findByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
    });

    // Mock Location
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -34, longitude: -58 }
    });

    // Mock Location API Response
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    getFriendsLocations.mockResolvedValue({
      friends: [
        { 
          userId: 'loc-1', 
          username: 'nearby-user', 
          distance: '500 m', 
          updatedAt: fiveMinutesAgo 
        }
      ]
    });

    fireEvent.press(getByText('Por Cercanía'));

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(getFriendsLocations).toHaveBeenCalledWith({ latitude: -34, longitude: -58 });
    });

    expect(await findByText('nearby-user')).toBeTruthy();
    expect(await findByText('📍 500 m')).toBeTruthy();
    expect(await findByText(/hace 5 min/)).toBeTruthy();
  });

  it('correctly formats different time intervals in formatTimeAgo', async () => {
    // Para testear las distintas ramas de formatTimeAgo (ahora, min, h, d, null)
    friendsApi.getFriendsList.mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });
    
    // 1. Caso: Hace 2 horas
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    // 2. Caso: Hace 3 días
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    // 3. Caso: Ahora (menos de 1 min)
    const justNow = new Date(Date.now() - 30 * 1000).toISOString();

    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });
    getFriendsLocations.mockResolvedValue({
      friends: [
        { userId: 'u1', username: 'user1', distance: '1 km', updatedAt: twoHoursAgo },
        { userId: 'u2', username: 'user2', distance: '2 km', updatedAt: threeDaysAgo },
        { userId: 'u3', username: 'user3', distance: '3 km', updatedAt: justNow },
        { userId: 'u4', username: 'user4', distance: '4 km', updatedAt: null },
      ]
    });

    const { getByText, findByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    // Wait for initial
    await waitFor(() => expect(friendsApi.getFriendsList).toHaveBeenCalled());
    
    fireEvent.press(getByText('Por Cercanía'));

    expect(await findByText(/hace 2 h/)).toBeTruthy();
    expect(await findByText(/hace 3 d/)).toBeTruthy();
    expect(await findByText(/ahora/)).toBeTruthy();
    
    // El u4 no debería tener el texto de tiempo porque updatedAt es null
    // (según el componente: {item.updatedAt && ...})
  });

  it('handles location permission denial when switching to proximity sort', async () => {
    friendsApi.getFriendsList.mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { getByText, findByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    // Wait for initial alphabetical fetch to complete
    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
    });

    fireEvent.press(getByText('Por Cercanía'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Se requiere permiso de ubicación para ordenar por cercanía.');
    });
    
    // Debería mantenerse en alfabético
    expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
  });

  it('handles pull to refresh', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });

    const { getByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => expect(friendsApi.getFriendsList).toHaveBeenCalled());
    
    const flatList = getByTestId('friends-list');
    const { refreshControl } = flatList.props;
    
    friendsApi.getFriendsList.mockClear();
    
    refreshControl.props.onRefresh();

    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
    });
  });

  it('handles load more on end reached', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: [{friend_id:1, friend_username:'user1'}], pagination: { page: 1, totalPages: 2 } } 
    });

    const { getByTestId, findByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await findByText('user1');
    
    const flatList = getByTestId('friends-list');
    
    friendsApi.getFriendsList.mockClear();
    
    flatList.props.onEndReached();

    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 2);
    });
  });

  it('handles refresh and reset of hasMore', async () => {
    friendsApi.getFriendsList.mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });
    const { getByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    const flatList = getByTestId('friends-list');
    await act(async () => {
      flatList.props.refreshControl.props.onRefresh();
    });
    
    expect(friendsApi.getFriendsList).toHaveBeenCalled();
  });

  it('covers catch block and alert on fetch error', async () => {
    friendsApi.getFriendsList.mockRejectedValueOnce(new Error('Test Error'));
    
    render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudieron cargar tus amigos.');
    });
  });

  it('covers pagination page check branches', async () => {
    // Caso donde pagination existe pero no hay mas paginas
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: [], pagination: { page: 2, totalPages: 2 } } 
    });
    render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    await waitFor(() => expect(friendsApi.getFriendsList).toHaveBeenCalled());
  });
  
  it('handles removing a friend', async () => {
    const mockFriends = [
      { friend_id: 1, friend_username: 'testuser1' },
    ];
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: mockFriends, pagination: { page: 1, totalPages: 1 } } 
    });
    friendsApi.removeFriend.mockResolvedValueOnce({ data: { message: 'Amistad eliminada' } });
    
    const { getByText, queryByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => expect(getByText('testuser1')).toBeTruthy());
    
    const removeButton = getByText('Eliminar');
    fireEvent.press(removeButton);
    
    // Check if Alert was called
    expect(Alert.alert).toHaveBeenCalledWith(
      'Eliminar Amigo',
      expect.stringContaining('testuser1'),
      expect.any(Array)
    );
    
    // Extract the "Eliminar" button from the Alert call and press it
    const alertButtons = Alert.alert.mock.calls[0][2];
    const deleteOption = alertButtons.find(b => b.text === 'Eliminar');
    
    await act(async () => {
      await deleteOption.onPress();
    });
    
    expect(friendsApi.removeFriend).toHaveBeenCalledWith(1);
    
    // Check if friend is removed from list
    await waitFor(() => {
      expect(queryByText('testuser1')).toBeNull();
    });
  });

  it('handles error when removing a friend', async () => {
    const mockFriends = [{ friend_id: 1, friend_username: 'testuser1' }];
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: mockFriends, pagination: { page: 1, totalPages: 1 } } 
    });
    friendsApi.removeFriend.mockRejectedValueOnce(new Error('API Error'));
    
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => expect(getByText('testuser1')).toBeTruthy());
    
    fireEvent.press(getByText('Eliminar'));
    
    // Alert confirmación
    const alertButtons = Alert.alert.mock.calls[0][2];
    const deleteOption = alertButtons.find(b => b.text === 'Eliminar');
    
    await act(async () => {
      await deleteOption.onPress();
    });
    
    expect(friendsApi.removeFriend).toHaveBeenCalledWith(1);
    
    // Alert error (segundo llamado a Alert.alert)
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'No se pudo eliminar al amigo. Reintentá más tarde.');
    });
    
    // El amigo debe seguir en la lista
    expect(getByText('testuser1')).toBeTruthy();
  });

  it('handles responseData as an array directly', async () => {
    const mockFriends = [{ friend_id: 3, friend_username: 'directArrayUser' }];
    friendsApi.getFriendsList.mockResolvedValueOnce({ data: mockFriends });
    
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => {
      expect(getByText('directArrayUser')).toBeTruthy();
    });
  });

  it('handles missing pagination in response', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({ data: { data: [{ friend_id: 4, friend_username: 'noPagination' }] } });
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    await waitFor(() => {
      expect(getByText('noPagination')).toBeTruthy();
    });
  });

  it('handles missing username fallback', async () => {
    const mockFriends = [{ friend_id: 5 }]; // No username
    friendsApi.getFriendsList.mockResolvedValueOnce({ data: { data: mockFriends } });

    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    await waitFor(() => {
      // The avatar should show '?' if username is missing
      expect(getByText('?')).toBeTruthy();
    });
  });

  it('handles missing friend_id in keyExtractor', async () => {
    const mockFriends = [{ friend_username: 'noIdUser' }]; 
    friendsApi.getFriendsList.mockResolvedValueOnce({ data: { data: mockFriends } });
    
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => {
      expect(getByText('noIdUser')).toBeTruthy();
    });
  });

  it('does not load more if hasMore is false', async () => {
    // First call returns hasMore: false (totalPages: 1)
    friendsApi.getFriendsList.mockResolvedValueOnce({ 
      data: { data: [{friend_id: 1, friend_username: 'user1'}], pagination: { page: 1, totalPages: 1 } } 
    });
    
    const { getByTestId, findByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    await findByText('user1');
    
    const flatList = getByTestId('friends-list');
    friendsApi.getFriendsList.mockClear();
    
    // Call onEndReached
    flatList.props.onEndReached();
    
    // Should NOT have been called again
    expect(friendsApi.getFriendsList).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// H11 CA.2: indicador online en FriendsList
// ---------------------------------------------------------------------------
describe('FriendsList — indicador online (H11 CA.2)', () => {
  const mockOnGoToSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('CA.2: muestra el punto online para un amigo con is_online true', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({
      data: {
        data: [{ friend_id: 'user-1', friend_username: 'alice', is_online: true }],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const { findByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    const dot = await findByTestId('online-dot-user-1');
    expect(dot).toBeTruthy();
  });

  it('CA.2: muestra el punto offline para un amigo con is_online false', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({
      data: {
        data: [{ friend_id: 'user-2', friend_username: 'bob', is_online: false }],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const { findByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    const dot = await findByTestId('online-dot-user-2');
    expect(dot).toBeTruthy();
  });

  it('CA.2: el punto de un amigo online tiene backgroundColor verde', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({
      data: {
        data: [{ friend_id: 'user-3', friend_username: 'carlos', is_online: true }],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const { findByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    const dot = await findByTestId('online-dot-user-3');
    const flatStyle = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style)
      : dot.props.style;
    expect(flatStyle.backgroundColor).toBe('#22c55e');
  });

  it('CA.2: el punto de un amigo offline tiene backgroundColor gris', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({
      data: {
        data: [{ friend_id: 'user-4', friend_username: 'diana', is_online: false }],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const { findByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    const dot = await findByTestId('online-dot-user-4');
    const flatStyle = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style)
      : dot.props.style;
    expect(flatStyle.backgroundColor).toBe('#6b7280');
  });

  it('CA.2: cada amigo tiene su propio indicador identificado por friend_id', async () => {
    friendsApi.getFriendsList.mockResolvedValueOnce({
      data: {
        data: [
          { friend_id: 'user-5', friend_username: 'eli', is_online: true },
          { friend_id: 'user-6', friend_username: 'fran', is_online: false },
        ],
        pagination: { page: 1, totalPages: 1 },
      },
    });

    const { findByTestId } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    expect(await findByTestId('online-dot-user-5')).toBeTruthy();
    expect(await findByTestId('online-dot-user-6')).toBeTruthy();
  });
});
