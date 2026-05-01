import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// expo-location mock
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('../../src/api/locations', () => ({
  locationsApi: {
    getRadar: jest.fn(),
  },
}));

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    sendRequest: jest.fn(),
  },
}));

import * as Location from 'expo-location';
import { locationsApi } from '../../src/api/locations';
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
  });

  it('calls getRadar on mount and shows loading state', async () => {
    // Permission and location granted, but getRadar never resolves (keeps loading)
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -34.6, longitude: -58.4 },
    });
    locationsApi.getRadar.mockReturnValue(new Promise(() => {})); // pending

    const { UNSAFE_getByType } = render(<NearbyUsersList />);

    // While the radar call is in-flight the component renders ActivityIndicator
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders nearby users after successful fetch', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [
          { userId: 'u1', username: 'alice', distance: '1.2 km', distanceMeters: 1200 },
          { userId: 'u2', username: 'bob', distance: '800 m', distanceMeters: 800 },
        ],
      },
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
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u1', username: 'alice', distance: '500 m', distanceMeters: 500 }],
      },
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('1 usuario encontrado');
  });

  it('renders empty state when no nearby users', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({ data: { users: [] } });

    const { findByText } = render(<NearbyUsersList />);

    await findByText('Nadie cerca');
    await findByText('Sin usuarios cercanos');
  });

  it('renders empty state when users key is missing', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({ data: {} }); // no `users` key

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
    expect(locationsApi.getRadar).not.toHaveBeenCalled();
  });

  it('shows alert on API error with response message', async () => {
    grantedLocation();
    const apiErr = new Error('fail');
    apiErr.response = { data: { error: 'Too far away' } };
    locationsApi.getRadar.mockRejectedValueOnce(apiErr);

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Too far away');
    });
  });

  it('shows alert on API error with err.message fallback', async () => {
    grantedLocation();
    locationsApi.getRadar.mockRejectedValueOnce(new Error('Network error'));

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Network error');
    });
  });

  it('shows alert on API error with generic fallback when no message', async () => {
    grantedLocation();
    locationsApi.getRadar.mockRejectedValueOnce({}); // error without message or response

    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');
    render(<NearbyUsersList />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'Error al buscar usuarios cercanos');
    });
  });

  it('sends friend request and changes button to Pendiente', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u1', username: 'alice', distance: '1.2 km', distanceMeters: 1200 }],
      },
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
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u2', username: 'bob', distance: '500 m', distanceMeters: 500 }],
      },
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
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u3', username: 'carol', distance: '300 m', distanceMeters: 300 }],
      },
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

  it('renders avatar initial as uppercase first letter of username', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u1', username: 'diana', distance: '200 m', distanceMeters: 200 }],
      },
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('D'); // avatar initial
  });

  it('uses U as avatar fallback when username is empty', async () => {
    grantedLocation();
    locationsApi.getRadar.mockResolvedValueOnce({
      data: {
        users: [{ userId: 'u1', username: '', distance: '100 m', distanceMeters: 100 }],
      },
    });

    const { findByText } = render(<NearbyUsersList />);
    await findByText('U'); // fallback
  });
});
