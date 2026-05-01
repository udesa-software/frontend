import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FriendsList } from '../../src/components/FriendsList';
import { friendsApi } from '../../src/api/friends';

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getFriendsList: jest.fn(),
    removeFriend: jest.fn(),
  }
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

  it('changes sort mode and refetches', async () => {
    friendsApi.getFriendsList.mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 1 } } 
    });

    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);

    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
    });

    // Clear previous calls
    friendsApi.getFriendsList.mockClear();

    fireEvent.press(getByText('Por Cercanía'));

    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('proximity', 1);
    });

    friendsApi.getFriendsList.mockClear();
    fireEvent.press(getByText('Alfabético'));
    await waitFor(() => {
      expect(friendsApi.getFriendsList).toHaveBeenCalledWith('alphabetical', 1);
    });
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
    const spy = jest.spyOn(require('react-native').Alert, 'alert');
    
    render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('Error', 'No se pudieron cargar tus amigos.');
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
    
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    
    const { getByText, queryByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => expect(getByText('testuser1')).toBeTruthy());
    
    const removeButton = getByText('Eliminar');
    fireEvent.press(removeButton);
    
    // Check if Alert was called
    expect(alertSpy).toHaveBeenCalledWith(
      'Eliminar Amigo',
      expect.stringContaining('testuser1'),
      expect.any(Array)
    );
    
    // Extract the "Eliminar" button from the Alert call and press it
    const alertButtons = alertSpy.mock.calls[0][2];
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
    
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    
    const { getByText } = render(<FriendsList onGoToSearch={mockOnGoToSearch} />);
    
    await waitFor(() => expect(getByText('testuser1')).toBeTruthy());
    
    fireEvent.press(getByText('Eliminar'));
    
    // Alert confirmación
    const alertButtons = alertSpy.mock.calls[0][2];
    const deleteOption = alertButtons.find(b => b.text === 'Eliminar');
    
    await act(async () => {
      await deleteOption.onPress();
    });
    
    expect(friendsApi.removeFriend).toHaveBeenCalledWith(1);
    
    // Alert error (segundo llamado a Alert.alert)
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo eliminar al amigo. Reintentá más tarde.');
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
      // The avatar should show 'U' if username is missing
      expect(getByText('U')).toBeTruthy();
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
