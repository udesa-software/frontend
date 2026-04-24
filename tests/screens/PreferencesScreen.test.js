import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PreferencesScreen } from '../../src/screens/PreferencesScreen';
import { usersApi } from '../../src/api/users';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../src/api/users', () => ({
  usersApi: {
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
  },
}));

describe('PreferencesScreen', () => {
  const mockPrefs = {
    data: {
      search_radius_km: 10,
      location_update_frequency: 15,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersApi.getPreferences.mockResolvedValue(mockPrefs);
  });

  it('renders correctly and loads preferences', async () => {
    const { findByText, getByDisplayValue } = render(<PreferencesScreen />);

    expect(await findByText('Preferencias')).toBeTruthy();

    expect(usersApi.getPreferences).toHaveBeenCalledTimes(1);

    expect(getByDisplayValue('10')).toBeTruthy();
    expect(await findByText('15 min')).toBeTruthy();
  });

  it('handles saving preferences successfully', async () => {
    usersApi.updatePreferences.mockResolvedValueOnce({ success: true });
    const { getByText, getByPlaceholderText, findByText } = render(<PreferencesScreen />);

    await waitFor(() => expect(usersApi.getPreferences).toHaveBeenCalled());

    const radiusInput = getByPlaceholderText('Ej: 25');
    fireEvent.changeText(radiusInput, '30');

    // Select 30 min frequency
    fireEvent.press(getByText('30 min'));

    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });

    expect(usersApi.updatePreferences).toHaveBeenCalledWith({
      search_radius_km: 30,
      location_update_frequency: 30,
    });

    expect(await findByText('Preferencias guardadas exitosamente.')).toBeTruthy();
  });

  it('shows error if saving fails', async () => {
    const errorMessage = 'Error del servidor';
    usersApi.updatePreferences.mockRejectedValueOnce({
      response: { data: { message: errorMessage } }
    });

    const { getByText, findByText } = render(<PreferencesScreen />);

    await waitFor(() => expect(usersApi.getPreferences).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });

    expect(await findByText(errorMessage)).toBeTruthy();
  });

  it('navigates back when Volver is pressed', async () => {
    const { findByText } = render(<PreferencesScreen />);
    
    const backBtn = await findByText('Volver');
    fireEvent.press(backBtn);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('handles non-numeric radius by letting backend decide', async () => {
    usersApi.updatePreferences.mockResolvedValueOnce({ success: true });
    const { getByText, getByPlaceholderText } = render(<PreferencesScreen />);

    await waitFor(() => expect(usersApi.getPreferences).toHaveBeenCalled());

    const radiusInput = getByPlaceholderText('Ej: 25');
    fireEvent.changeText(radiusInput, 'abc');

    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });

    expect(usersApi.updatePreferences).toHaveBeenCalledWith({
      search_radius_km: 'abc',
      location_update_frequency: 15, // original value from mock
    });
  });
});
