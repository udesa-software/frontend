import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// expo-location mock
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../src/api/location', () => ({
  getRadar: jest.fn(),
}));

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    sendRequest: jest.fn(),
    getRelationshipStatuses: jest.fn(),
    removeFriend: jest.fn(),
    cancelRequest: jest.fn(),
    acceptRequest: jest.fn(),
  },
}));

import * as Location from 'expo-location';
import { getRadar } from '../../src/api/location';
import { friendsApi } from '../../src/api/friends';
import { NearbyUsersList } from '../../src/components/NearbyUsersList';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const grantedLocation = () => {
  Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: -34.6, longitude: -58.4 },
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NearbyUsersList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    friendsApi.getRelationshipStatuses.mockResolvedValue({ data: {} });
  });

  it('calls getRadar on mount and shows loading state', async () => {
    // Permission and location granted, but getRadar never resolves (keeps loading)
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -34.6, longitude: -58.4 },
    });
    getRadar.mockReturnValue(new Promise(() => {})); // pending

    const { UNSAFE_getByType } = render(<NearbyUsersList />);

    // While the radar call is in-flight the component renders ActivityIndicator
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders nearby users after successful fetch', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [
        { userId: 'u1', username: 'alice', distance: '1.2 km', distanceMeters: 1200 },
        { userId: 'u2', username: 'bob', distance: '800 m', distanceMeters: 800 },
      ],
    });

    const { findByText, getByText } = render(<NearbyUsersList />);

    await findByText('alice');
    expect(getByText('bob')).toBeTruthy();
    expect(getByText('📍 1.2 km')).toBeTruthy();
    expect(getByText('📍 800 m')).toBeTruthy();
    // Results label
    expect(getByText('2 usuarios encontrados')).toBeTruthy();
  });

  it('renders singular result label for 1 user', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u1', username: 'alice', distance: '500 m', distanceMeters: 500 }],
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('1 usuario encontrado');
  });

  it('renders empty state when no nearby users', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({ users: [] });

    const { findByText } = render(<NearbyUsersList />);

    await findByText('Nadie cerca');
    await findByText('Sin usuarios cercanos');
  });

  it('renders empty state when users key is missing', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({}); // no `users` key

    const { findByText } = render(<NearbyUsersList />);
    await findByText('Nadie cerca');
  });

  it('shows alert and does NOT crash when location permission denied', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Permiso de ubicación requerido',
        expect.any(String)
      );
    });
    // getRadar should not be called if no permission
    expect(getRadar).not.toHaveBeenCalled();
  });

  it('shows alert on API error with response message', async () => {
    grantedLocation();
    const apiErr = new Error('fail');
    apiErr.response = { data: { error: 'Too far away' } };
    getRadar.mockRejectedValueOnce(apiErr);

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Too far away');
    });
  });

  it('shows alert on API error with err.message fallback', async () => {
    grantedLocation();
    getRadar.mockRejectedValueOnce(new Error('Network error'));

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('shows alert on API error with generic fallback when no message', async () => {
    grantedLocation();
    getRadar.mockRejectedValueOnce({}); // error without message or response

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Error al buscar usuarios cercanos');
    });
  });

  it('sends friend request and changes button to Pendiente', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u1', username: 'alice', distance: '1.2 km', distanceMeters: 1200 }],
    });
    friendsApi.getRelationshipStatuses.mockResolvedValueOnce({
      data: { 'u1': 'none' },
    });
    friendsApi.sendRequest.mockResolvedValueOnce({ data: { message: 'Ok' } });

    const { findByText, getByText, queryByText } = render(<NearbyUsersList />);

    await findByText('alice');
    fireEvent.press(getByText('Agregar'));

    await waitFor(() => {
      expect(friendsApi.sendRequest).toHaveBeenCalledWith('u1');
    });

    await findByText('Pendiente');
    expect(queryByText('Agregar')).toBeNull();
  });

  it('shows alert and keeps Agregar button on sendRequest error with response', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u2', username: 'bob', distance: '500 m', distanceMeters: 500 }],
    });
    friendsApi.getRelationshipStatuses.mockResolvedValueOnce({
      data: { 'u2': 'none' },
    });
    const apiErr = new Error('err');
    apiErr.response = { data: { error: 'Ya enviaste solicitud' } };
    friendsApi.sendRequest.mockRejectedValueOnce(apiErr);

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { findByText, getByText } = render(<NearbyUsersList />);

    await findByText('bob');
    fireEvent.press(getByText('Agregar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Ya enviaste solicitud');
    });

    // Button should remain "Agregar"
    expect(getByText('Agregar')).toBeTruthy();
  });

  it('shows alert on sendRequest error with err.message fallback', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u3', username: 'carol', distance: '300 m', distanceMeters: 300 }],
    });
    friendsApi.getRelationshipStatuses.mockResolvedValueOnce({
      data: { 'u3': 'none' },
    });
    friendsApi.sendRequest.mockRejectedValueOnce(new Error('Send failed'));

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    const { findByText, getByText } = render(<NearbyUsersList />);

    await findByText('carol');
    fireEvent.press(getByText('Agregar'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Send failed');
    });
  });

  it('handles other status actions: friends, pending_received, and pending_sent', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [
        { userId: 'u1', username: 'amigo', distance: '1km' },
        { userId: 'u2', username: 'recibido', distance: '1km' },
        { userId: 'u3', username: 'enviado', distance: '1km' }
      ],
    });
    friendsApi.getRelationshipStatuses.mockResolvedValueOnce({
      data: { 'u1': 'friends', 'u2': 'pending_received', 'u3': 'pending_sent' },
    });

    const { findByText, getByText } = render(<NearbyUsersList />);

    await findByText('amigo');
    await findByText('recibido');
    await findByText('enviado');

    // Remove friend
    friendsApi.removeFriend.mockResolvedValueOnce({ data: {} });
    fireEvent.press(getByText('Eliminar'));
    await waitFor(() => expect(friendsApi.removeFriend).toHaveBeenCalledWith('u1'));

    // Accept request
    friendsApi.acceptRequest.mockResolvedValueOnce({ data: {} });
    fireEvent.press(getByText('Aceptar'));
    await waitFor(() => expect(friendsApi.acceptRequest).toHaveBeenCalledWith('u2'));

    // Cancel request
    friendsApi.cancelRequest.mockResolvedValueOnce({ data: {} });
    fireEvent.press(getByText('Pendiente'));
    await waitFor(() => expect(friendsApi.cancelRequest).toHaveBeenCalledWith('u3'));
  });

  it('does not render actions for self or blocked status', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [
        { userId: 'u1', username: 'selfuser', distance: '1km' },
        { userId: 'u2', username: 'blockeduser', distance: '1km' }
      ],
    });
    friendsApi.getRelationshipStatuses.mockResolvedValueOnce({
      data: { 'u1': 'self', 'u2': 'blocked' },
    });

    const { findByText, queryByText } = render(<NearbyUsersList />);

    await findByText('selfuser');
    await findByText('blockeduser');

    expect(queryByText('Agregar')).toBeNull();
  });

  it('renders avatar initial as uppercase first letter of username', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u1', username: 'diana', distance: '200 m', distanceMeters: 200 }],
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('D'); // avatar initial
  });

  it('uses U as avatar fallback when username is empty', async () => {
    grantedLocation();
    getRadar.mockResolvedValueOnce({
      users: [{ userId: 'u1', username: '', distance: '100 m', distanceMeters: 100 }],
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('U'); // fallback
  });
});
