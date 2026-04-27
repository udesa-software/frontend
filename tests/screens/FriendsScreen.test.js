import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../src/api/users', () => ({
  usersApi: {
    search: jest.fn(),
  }
}));
jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    sendRequest: jest.fn(),
  }
}));

import { FriendsScreen } from '../../src/screens/FriendsScreen';
import { usersApi } from '../../src/api/users';
import { friendsApi } from '../../src/api/friends';

describe('FriendsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.search.mockResolvedValue({ data: [] });
    friendsApi.sendRequest.mockResolvedValue({ data: { message: 'Ok' } });
  });

  it('renders correctly', () => {
    // Mock getFriendsList for default tab
    friendsApi.getFriendsList = jest.fn().mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 0 } } 
    });
    const { getByText } = render(<FriendsScreen />);
    expect(getByText('Amigos')).toBeTruthy();
    expect(getByText('Mis Amigos')).toBeTruthy();
    expect(getByText('Explorar')).toBeTruthy();
  });

  it('does not search if query is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<FriendsScreen />);
    // Switch to search tab first
    fireEvent.press(getByText('Explorar'));
    
    fireEvent.press(getByText('Buscar'));

    await waitFor(() => {
      expect(usersApi.search).not.toHaveBeenCalled();
    });
  });

  it('searches users successfully', async () => {
    usersApi.search.mockResolvedValueOnce({
      data: [{ id: '1', username: 'juan', biography: 'Hola' }]
    });

    const { getByPlaceholderText, getByText, findByText } = render(<FriendsScreen />);
    
    fireEvent.press(getByText('Explorar'));

    const input = getByPlaceholderText('Buscar por usuario');
    fireEvent.changeText(input, 'juan');
    fireEvent.press(getByText('Buscar'));

    await findByText('juan');
    expect(getByText('Hola')).toBeTruthy();
    expect(usersApi.search).toHaveBeenCalledWith('juan');
  });

  it('renders default biography if user has none', async () => {
    usersApi.search.mockResolvedValueOnce({
      data: [{ id: '1', username: 'pedro' }]
    });

    const { getByPlaceholderText, getByText, findByText } = render(<FriendsScreen />);
    
    fireEvent.press(getByText('Explorar'));

    const input = getByPlaceholderText('Buscar por usuario');
    fireEvent.changeText(input, 'pedro');
    fireEvent.press(getByText('Buscar'));

    await findByText('pedro');
    expect(getByText('Sin biografía')).toBeTruthy();
  });

  it('handles search error gracefully', async () => {
    usersApi.search.mockRejectedValueOnce(new Error('Network error'));
    const { getByPlaceholderText, getByText } = render(<FriendsScreen />);
    
    fireEvent.press(getByText('Explorar'));

    fireEvent.changeText(getByPlaceholderText('Buscar por usuario'), 'error');
    fireEvent.press(getByText('Buscar'));

    await waitFor(() => {
      expect(usersApi.search).toHaveBeenCalled();
    });
    // It should not crash, and should stop indicator
  });

  it('sends friend request successfully and changes button to Pendiente', async () => {
    usersApi.search.mockResolvedValueOnce({
      data: [{ id: '1', username: 'juan', biography: 'Hola' }]
    });

    const { getByPlaceholderText, getByText, findByText, queryByText } = render(<FriendsScreen />);
    
    fireEvent.press(getByText('Explorar'));

    fireEvent.changeText(getByPlaceholderText('Buscar por usuario'), 'juan');
    fireEvent.press(getByText('Buscar'));

    await findByText('juan');
    
    const addButton = getByText('Agregar');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(friendsApi.sendRequest).toHaveBeenCalledWith('1');
    });

    await findByText('Pendiente');
    expect(queryByText('Agregar')).toBeNull(); // El botón original cambió
  });

  it('handles sendRequest error gracefully', async () => {
    usersApi.search.mockResolvedValueOnce({
      data: [{ id: '1', username: 'juan', biography: 'Hola' }]
    });
    friendsApi.sendRequest.mockRejectedValueOnce({ response: { data: { error: 'Error' } } });

    const { getByPlaceholderText, getByText, findByText } = render(<FriendsScreen />);
    
    fireEvent.press(getByText('Explorar'));

    fireEvent.changeText(getByPlaceholderText('Buscar por usuario'), 'juan');
    fireEvent.press(getByText('Buscar'));

    await findByText('juan');
    
    // Suprimimos console.error de la UI o Alert para prueba
    const spy = jest.spyOn(require('react-native').Alert, 'alert');
    fireEvent.press(getByText('Agregar'));

    await waitFor(() => {
      expect(friendsApi.sendRequest).toHaveBeenCalledWith('1');
      expect(spy).toHaveBeenCalledWith('Error', 'Error');
    });
  });

  it('switches between tabs successfully', async () => {
    // Mock getPendingRequests for the PendingRequestsList component
    friendsApi.getPendingRequests = jest.fn().mockResolvedValue({ 
      data: { data: [], pagination: { page: 1, totalPages: 0 } } 
    });

    const { getByText, queryByPlaceholderText, queryByText } = render(<FriendsScreen />);
    
    // Initially on 'friends' tab
    expect(queryByText('Alfabético')).toBeTruthy(); // from FriendsList
    expect(queryByPlaceholderText('Buscar por usuario')).toBeNull();

    // Switch to 'search' tab
    const searchTab = getByText('Explorar');
    fireEvent.press(searchTab);

    // Search input should be present
    expect(queryByPlaceholderText('Buscar por usuario')).toBeTruthy();
    expect(queryByText('Alfabético')).toBeNull();

    // Switch to 'pending' tab
    const pendingTab = getByText('Solicitudes');
    fireEvent.press(pendingTab);

    // The search input should disappear because it's rendering PendingRequestsList
    expect(queryByPlaceholderText('Buscar por usuario')).toBeNull();
  });
});
