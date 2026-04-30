import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FriendsList } from '../../src/components/FriendsList';
import { friendsApi } from '../../src/api/friends';

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    getFriendsList: jest.fn(),
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
});
