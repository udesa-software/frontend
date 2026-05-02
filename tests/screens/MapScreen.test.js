import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { MapScreen } from '../../src/screens/MapScreen';
import { Alert } from 'react-native';
import * as Battery from 'expo-battery';


const mockUser = {
  userId: 'usr_001',
  username: 'demouser',
  email: 'demo@udesa.edu.ar',
};

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: (props) => <Text>{props.name}</Text>,
  };
});

const mockRequestPermissions = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockGetLastKnownPosition = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args) => mockRequestPermissions(...args),
  getCurrentPositionAsync: (...args) => mockGetCurrentPosition(...args),
  getLastKnownPositionAsync: (...args) => mockGetLastKnownPosition(...args),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-battery', () => ({
  getBatteryLevelAsync: jest.fn(),
}));

// Mock API
const mockUpdateLocation = jest.fn();
const mockGetFriendsLocations = jest.fn();
const mockUpdateLabel = jest.fn();
const mockDeleteLabel = jest.fn();

jest.mock('../../src/api/location', () => ({
  updateLocation: (...args) => mockUpdateLocation(...args),
  getFriendsLocations: (...args) => mockGetFriendsLocations(...args),
  updateLabel: (...args) => mockUpdateLabel(...args),
  deleteLabel: (...args) => mockDeleteLabel(...args),
}));

// Mock Map components to avoid native module errors
const mockAnimateToRegion = jest.fn();
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  class MockMapView extends React.Component {
    animateToRegion = (...args) => mockAnimateToRegion(...args);
    render() {
      return <View testID="map-view">{this.props.children}</View>;
    }
  }

  const MockMarker = (props) => <View testID="map-marker">{props.children}</View>;
  const MockCallout = (props) => <View testID="map-callout">{props.children}</View>;
  
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Callout: MockCallout,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
  };
});

// Suppress act() warnings from React Testing Library
const originalError = console.error;
const originalWarn = console.warn;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('not wrapped in act(')) return;
    originalError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});



describe('<MapScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastKnownPosition.mockResolvedValue(null);
    mockGetFriendsLocations.mockResolvedValue({ friends: [] });
    mockUpdateLocation.mockResolvedValue({});
    mockUpdateLabel.mockResolvedValue({});
    mockDeleteLabel.mockResolvedValue({});
    Battery.getBatteryLevelAsync.mockResolvedValue(0.5);
    console.warn = jest.fn();
  });

  test('shows loading state while obtaining location', () => {
    mockRequestPermissions.mockReturnValue(new Promise(() => {}));
    render(<MapScreen />);
    expect(screen.getByText('Localizando...')).toBeTruthy();
  });

  test('shows error when location permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'denied' });
    const linkingSpy = jest.spyOn(require('react-native').Linking, 'openSettings').mockImplementation(() => {});

    render(<MapScreen />);
    await waitFor(() => expect(screen.getByText('Permiso denegado.')).toBeTruthy());

    fireEvent.press(screen.getByText('Configuración'));
    expect(linkingSpy).toHaveBeenCalled();
    linkingSpy.mockRestore();
  });

  test('renders user and friends successfully', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: -34.5833, longitude: -58.4372 } });
    mockGetFriendsLocations.mockResolvedValue({
      friends: [{ userId: '2', username: 'juan', latitude: -34.5834, longitude: -58.4373, distance: '12m', label: 'Estudiando' }]
    });

    render(<MapScreen />);
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('juan')).toBeTruthy());
    expect(screen.getByText('@demouser')).toBeTruthy();
    expect(screen.getByText('✨ Estudiando')).toBeTruthy();
  });

  test('updates label successfully', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));

    fireEvent.changeText(screen.getByPlaceholderText('Pon tu estado...'), 'Estudiando');
    fireEvent.press(await screen.findByText('checkmark-circle'));

    await waitFor(() => expect(mockUpdateLabel).toHaveBeenCalledWith('Estudiando'));
  });

  test('deletes label successfully', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));

    fireEvent.changeText(screen.getByPlaceholderText('Pon tu estado...'), 'test');
    fireEvent.press(await screen.findByText('checkmark-circle'));
    
    const deleteBtn = await screen.findByText('close-circle-outline');
    fireEvent.press(deleteBtn);

    await waitFor(() => expect(mockDeleteLabel).toHaveBeenCalled());
  });

  test('does not send location when battery is low', async () => {
    Battery.getBatteryLevelAsync.mockResolvedValue(0.1); 

    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });

  test('handles location update error', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });
    mockUpdateLocation.mockRejectedValue({ status: 500, message: 'fail' });

    render(<MapScreen />);
    await waitFor(() => expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Sync Error]')));
  });

  test('falls back to last known location when GPS fails', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockRejectedValue(new Error('fail'));
    mockGetLastKnownPosition.mockResolvedValue({ coords: { latitude: -34.60, longitude: -58.38 } });

    render(<MapScreen />);
    await waitFor(() => expect(screen.getByTestId('map-view')).toBeTruthy());
  });

  test('shows error when GPS crashes', async () => {
    mockRequestPermissions.mockRejectedValue(new Error('fail'));
    render(<MapScreen />);
    await waitFor(() => expect(screen.getByText('Error de GPS.')).toBeTruthy());
  });

  test('applies jitter on collision', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    const coords = { latitude: 1, longitude: 1 };
    mockGetCurrentPosition.mockResolvedValue({ coords });
    mockGetFriendsLocations.mockResolvedValue({
      friends: [{ userId: '2', username: 'juan', latitude: 1, longitude: 1, distance: '0m' }]
    });

    render(<MapScreen />);
    await waitFor(() => expect(screen.getByText('juan')).toBeTruthy());
  });

  test('centerOnMe calls animateToRegion', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 10, longitude: 20 } });

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));

    fireEvent.press(screen.getByText('locate'));
    expect(mockAnimateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitude: 10, longitude: 20 }), 1000);
  });

  test('handles friends fetch error', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });
    mockGetFriendsLocations.mockRejectedValue({ status: 500, message: 'error' });

    render(<MapScreen />);
    await waitFor(() => expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[Friends Error]')));
  });

  test('handles delete label error', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });
    mockDeleteLabel.mockRejectedValue(new Error('fail'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));

    fireEvent.changeText(screen.getByPlaceholderText('Pon tu estado...'), 'test');
    fireEvent.press(await screen.findByText('checkmark-circle'));
    
    const deleteBtn = await screen.findByText('close-circle-outline');
    fireEvent.press(deleteBtn);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Error", "No se pudo borrar."));
  });

  test('updates location and friends on interval', async () => {
    jest.useFakeTimers();
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: -34, longitude: -58 } });

    render(<MapScreen />);
    
    // Trigger initial effects
    await act(async () => {
      jest.advanceTimersByTime(100); 
    });
    
    // We expect the first call from initLocation
    await waitFor(() => expect(mockUpdateLocation).toHaveBeenCalledTimes(1));

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => expect(mockUpdateLocation).toHaveBeenCalledTimes(2));
    expect(mockGetFriendsLocations).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  test('empty label calls deleteLabel', async () => {
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValue({ coords: { latitude: 0, longitude: 0 } });

    render(<MapScreen />);
    await waitFor(() => screen.getByTestId('map-view'));

    fireEvent.changeText(screen.getByPlaceholderText('Pon tu estado...'), '   '); 
    fireEvent.press(await screen.findByText('checkmark-circle'));

    await waitFor(() => expect(mockDeleteLabel).toHaveBeenCalled());
  });
});
