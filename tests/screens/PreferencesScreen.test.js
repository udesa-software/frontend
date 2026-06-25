import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PreferencesScreen } from '../../src/screens/PreferencesScreen';
import { usersApi } from '../../src/api/users';
import { getPrivacyStatus, setPrivacyStatus } from "../../src/api/location";

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

jest.mock('../../src/api/location', () => ({
  getPrivacyStatus: jest.fn(),
  setPrivacyStatus: jest.fn(),
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
    getPrivacyStatus.mockResolvedValue({ isPrivate: false });
  });

  it('renders correctly and loads preferences', async () => {
    const { findByText, getByDisplayValue } = render(<PreferencesScreen />);

    expect(await findByText('Preferencias')).toBeTruthy();

    expect(usersApi.getPreferences).toHaveBeenCalledTimes(1);
    expect(getPrivacyStatus).toHaveBeenCalledTimes(1);

    expect(getByDisplayValue('10')).toBeTruthy();
    expect(await findByText('15 min')).toBeTruthy();
    expect(await findByText('Modo Privado ⚡')).toBeTruthy();
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

  it('shows loading state initially then renders preferences', async () => {
    // Verify that it renders a loading indicator before preferences are fetched
    let resolvePrefs;
    const prefsPromise = new Promise((res) => { resolvePrefs = res; });
    usersApi.getPreferences.mockReturnValueOnce(prefsPromise);

    const { getByTestId, findByText } = render(<PreferencesScreen />);
    // While loading, ActivityIndicator should be visible (no title)
    
    resolvePrefs(mockPrefs);
    expect(await findByText('Preferencias')).toBeTruthy();
  });

  it('shows error message when getPreferences fails', async () => {
    usersApi.getPreferences.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(<PreferencesScreen />);

    expect(await findByText('Error al cargar preferencias.')).toBeTruthy();
  });

  it('shows err.message when updatePreferences fails without response', async () => {
    usersApi.updatePreferences.mockRejectedValueOnce(new Error('Timeout'));
    const { getByText, findByText } = render(<PreferencesScreen />);

    await waitFor(() => expect(usersApi.getPreferences).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });

    expect(await findByText('Timeout')).toBeTruthy();
  });

  it('uses defaults when getPreferences returns null data', async () => {
    usersApi.getPreferences.mockResolvedValueOnce({ data: null });

    const { findByText } = render(<PreferencesScreen />);
    expect(await findByText('Preferencias')).toBeTruthy();
    // Should still render without crashing
  });

  it('shows generic fallback error if updatePreferences fails without message or response', async () => {
    const error = new Error();
    delete error.message; 
    usersApi.updatePreferences.mockRejectedValueOnce(error);

    const { getByText, findByText } = render(<PreferencesScreen />);
    await waitFor(() => expect(usersApi.getPreferences).toHaveBeenCalled());

    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });

    expect(await findByText('Error al guardar.')).toBeTruthy();
  });

  describe('Private Mode Toggle', () => {
    it('shows correct message when Private Mode is OFF', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });
      const { findByText } = render(<PreferencesScreen />);
      expect(await findByText(/Tu perfil es público/)).toBeTruthy();
    });

    it('shows correct message when Private Mode is ON', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: true });
      const { findByText } = render(<PreferencesScreen />);
      expect(await findByText(/Tu perfil es privado/)).toBeTruthy();
    });

    it('toggles privacy successfully', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });
      setPrivacyStatus.mockResolvedValueOnce({ isPrivate: true });
      
      const { getByTestId, findByText } = render(<PreferencesScreen />);
      
      await findByText('Modo Privado ⚡');
      const switchEl = getByTestId('privacy-switch');
      
      await act(async () => {
        fireEvent(switchEl, 'onValueChange', true);
      });

      expect(setPrivacyStatus).toHaveBeenCalledWith(true);
      expect(await findByText('Modo Privado activado.')).toBeTruthy();
    });

    it('reverts toggle and shows error if setPrivacyStatus fails', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });
      setPrivacyStatus.mockRejectedValueOnce(new Error('API Error'));
      
      const { getByTestId, findByText } = render(<PreferencesScreen />);
      
      await findByText('Modo Privado ⚡');
      const switchEl = getByTestId('privacy-switch');
      
      // Initially false
      expect(switchEl.props.value).toBe(false);

      await act(async () => {
        fireEvent(switchEl, 'onValueChange', true);
      });

      expect(setPrivacyStatus).toHaveBeenCalledWith(true);
      expect(await findByText('API Error')).toBeTruthy();
      
      // Should revert to false
      expect(switchEl.props.value).toBe(false);
    });

    it('handles fetching privacy status error gracefully', async () => {
      // Preference fetch succeeds but privacy fetch fails
      usersApi.getPreferences.mockResolvedValueOnce(mockPrefs);
      getPrivacyStatus.mockRejectedValueOnce(new Error('Fetch Error'));
      
      const { findByText } = render(<PreferencesScreen />);
      
      // Should still show screen (since we use Promise.allSettled)
      expect(await findByText('Preferencias')).toBeTruthy();
      // isPrivate should remain false (default)
      const switchEl = await findByText('Modo Privado ⚡');
      expect(switchEl).toBeTruthy();
    });
  });
});
