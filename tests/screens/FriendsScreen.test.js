import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FriendsScreen } from '../../src/screens/FriendsScreen';
import { usersApi } from '../../src/api/users';
import { friendsApi } from '../../src/api/friends';

jest.mock('../../src/api/users');
jest.mock('../../src/api/friends');

describe('FriendsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.search.mockResolvedValue({ data: [] });
    friendsApi.sendRequest.mockResolvedValue({ data: { message: 'Ok' } });
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<FriendsScreen />);
    expect(getByText('Amigos')).toBeTruthy();
    expect(getByPlaceholderText('Buscar por usuario')).toBeTruthy();
  });

  it('does not search if query is empty', async () => {
    const { getByText } = render(<FriendsScreen />);
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
    const input = getByPlaceholderText('Buscar por usuario');
    fireEvent.changeText(input, 'pedro');
    fireEvent.press(getByText('Buscar'));

    await findByText('pedro');
    expect(getByText('Sin biografía')).toBeTruthy();
  });

  it('handles search error gracefully', async () => {
    usersApi.search.mockRejectedValueOnce(new Error('Network error'));
    const { getByPlaceholderText, getByText } = render(<FriendsScreen />);
    
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
});
