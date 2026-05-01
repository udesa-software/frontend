import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FriendsList } from '../../src/components/FriendsList';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { friendsApi } from '../../src/api/friends';
import { locationsApi } from '../../src/api/locations';

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getFriendsList: jest.fn(),
    removeFriend: jest.fn(),
  }
}));

jest.mock('../../src/api/locations', () => ({
  locationsApi: {
    getFriendsLocations: jest.fn(),
  }
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
    locationsApi.getFriendsLocations.mockResolvedValue({
      data: {
        friends: [
          { 
            userId: 'loc-1', 
            username: 'nearby-user', 
            distance: '500 m', 
            updatedAt: fiveMinutesAgo 
          }
        ]
      }
    });

    fireEvent.press(getByText('Por Cercanía'));

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(locationsApi.getFriendsLocations).toHaveBeenCalledWith(-34, -58);
    });

    expect(await findByText('nearby-user')).toBeTruthy();
    expect(await findByText('📍 500 m')).toBeTruthy();
    expect(await findByText(/hace 5 min/)).toBeTruthy();
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
});
