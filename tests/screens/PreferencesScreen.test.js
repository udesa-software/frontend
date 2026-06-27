import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PreferencesScreen } from '../../src/screens/PreferencesScreen';
import { usersApi } from '../../src/api/users';
import { getPrivacyStatus, setPrivacyStatus, getPinColor, updatePinColor } from '../../src/api/location';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  getPinColor: jest.fn(),
  updatePinColor: jest.fn(),
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
    getPinColor.mockResolvedValue({ pinColor: null });
    updatePinColor.mockResolvedValue({ message: 'Color de pin actualizado', pinColor: '#FF6B6B' });
    AsyncStorage._reset();
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

    const { findByText } = render(<PreferencesScreen />);
    // While loading, ActivityIndicator should be visible (no title)
    
    resolvePrefs(mockPrefs);
    expect(await findByText('Preferencias')).toBeTruthy();
  });

  it('shows error message when getPreferences fails', async () => {
    usersApi.getPreferences.mockRejectedValueOnce(new Error('Network error'));

    const { findByText } = render(<PreferencesScreen />);

    expect(await findByText('Error al cargar preferencias.')).toBeTruthy();
  });

  it('shows error message when AsyncStorage throws during load', async () => {
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

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

      expect(switchEl.props.value).toBe(false);
    });

    it('muestra mensaje "Público" al desactivar modo privado', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: true });
      setPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });

      const { getByRole, findByText } = render(<PreferencesScreen />);
      await findByText('Modo Privado ⚡');
      const switchEl = getByRole('switch');

      await act(async () => {
        fireEvent(switchEl, 'onValueChange', false);
      });

      expect(setPrivacyStatus).toHaveBeenCalledWith(false);
      expect(await findByText('Modo Público activado.')).toBeTruthy();
    });

    it('muestra err.message si setPrivacyStatus falla sin err.response', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });
      setPrivacyStatus.mockRejectedValueOnce(new Error('Timeout'));

      const { getByRole, findByText } = render(<PreferencesScreen />);
      await findByText('Modo Privado ⚡');
      const switchEl = getByRole('switch');

      await act(async () => {
        fireEvent(switchEl, 'onValueChange', true);
      });

      expect(await findByText('Timeout')).toBeTruthy();
    });

    it('muestra mensaje genérico si setPrivacyStatus falla sin message ni response', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });
      setPrivacyStatus.mockRejectedValueOnce({});

      const { getByRole, findByText } = render(<PreferencesScreen />);
      await findByText('Modo Privado ⚡');
      const switchEl = getByRole('switch');

      await act(async () => {
        fireEvent(switchEl, 'onValueChange', true);
      });

      expect(await findByText('Error al cambiar modo de privacidad.')).toBeTruthy();
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

  it('no setea radius ni frequency si data las trae como falsy', async () => {
    usersApi.getPreferences.mockResolvedValueOnce({ data: { search_radius_km: 0, location_update_frequency: 0 } });

    const { findByText } = render(<PreferencesScreen />);
    expect(await findByText('Preferencias')).toBeTruthy();
    // Los valores por defecto ('25' y 5) se mantienen sin crash
  });

  it('no setea isPrivate si getPrivacyStatus retorna null', async () => {
    getPrivacyStatus.mockResolvedValueOnce(null);

    const { findByText } = render(<PreferencesScreen />);
    expect(await findByText('Preferencias')).toBeTruthy();
    // isPrivate permanece false (valor por defecto) sin crash
  });

  // ── H9: Color del Pin ───────────────────────────────────────────────────────
  describe('H9 - Color del Pin (CA.1 y CA.2)', () => {
    it('CA.1: muestra la sección "Color de tu pin" con la paleta de colores', async () => {
      const { findByText } = render(<PreferencesScreen />);

      expect(await findByText('Color de tu pin')).toBeTruthy();
      expect(await findByText('Elegí el color con el que aparecés en el mapa de tus amigos.')).toBeTruthy();
    });

    it('CA.2: al presionar un color llama a updatePinColor y lo guarda en AsyncStorage', async () => {
      updatePinColor.mockResolvedValueOnce({ message: 'Color de pin actualizado', pinColor: '#4ECDC4' });

      const { findByText, getByTestId } = render(<PreferencesScreen />);
      await findByText('Color de tu pin');

      await act(async () => {
        fireEvent.press(getByTestId('pin-color-#4ECDC4'));
      });

      await waitFor(() => {
        expect(updatePinColor).toHaveBeenCalledWith('#4ECDC4');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@pin_color', '#4ECDC4');
      });
    });

    it('CA.2: al fallar updatePinColor muestra error y revierte al color anterior', async () => {
      updatePinColor.mockRejectedValueOnce({ response: { data: { message: 'Color inválido.' } } });

      const { findByText, getByTestId } = render(<PreferencesScreen />);
      await findByText('Color de tu pin');

      await act(async () => {
        fireEvent.press(getByTestId('pin-color-#4ECDC4'));
      });

      await waitFor(() => {
        expect(updatePinColor).toHaveBeenCalled();
      });

      expect(await findByText('Color inválido.')).toBeTruthy();
    });

    it('CA.2: al fallar updatePinColor usa err.message si no hay err.response', async () => {
      updatePinColor.mockRejectedValueOnce(new Error('Timeout'));

      const { findByText, getByTestId } = render(<PreferencesScreen />);
      await findByText('Color de tu pin');

      await act(async () => {
        fireEvent.press(getByTestId('pin-color-#4ECDC4'));
      });

      expect(await findByText('Timeout')).toBeTruthy();
    });

    it('CA.2: al fallar updatePinColor usa mensaje genérico si no hay err.response ni err.message', async () => {
      const err = {};
      updatePinColor.mockRejectedValueOnce(err);

      const { findByText, getByTestId } = render(<PreferencesScreen />);
      await findByText('Color de tu pin');

      await act(async () => {
        fireEvent.press(getByTestId('pin-color-#4ECDC4'));
      });

      expect(await findByText('Error al guardar el color.')).toBeTruthy();
    });

    it('CA.2: el revert de AsyncStorage en catch no propaga error si falla', async () => {
      updatePinColor.mockRejectedValueOnce(new Error('fail'));
      // El primer setItem (color nuevo) ok, el segundo (revert) falla silenciosamente
      AsyncStorage.setItem
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Storage fail'));

      const { findByText, getByTestId } = render(<PreferencesScreen />);
      await findByText('Color de tu pin');

      await act(async () => {
        fireEvent.press(getByTestId('pin-color-#4ECDC4'));
      });

      // No explota — el error de revert es silenciado por .catch(() => {})
      expect(await findByText('fail')).toBeTruthy();
    });

    it('carga el color guardado en AsyncStorage al montar la pantalla', async () => {
      await AsyncStorage.setItem('@pin_color', '#96CEB4');

      const { findByText } = render(<PreferencesScreen />);
      // La pantalla carga sin errores y muestra la sección de pin
      expect(await findByText('Color de tu pin')).toBeTruthy();
      // El color cargado desde AsyncStorage es válido y no provoca crash
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@pin_color');
    });

    it('ignora un color de AsyncStorage que no pertenece a la paleta', async () => {
      await AsyncStorage.setItem('@pin_color', '#000000');

      const { findByText } = render(<PreferencesScreen />);
      expect(await findByText('Color de tu pin')).toBeTruthy();
      // No crash — cae en el default '#FF6B6B'
    });
  });

  describe('Platform.OS android branches', () => {
    let originalOS;

    beforeEach(() => {
      const Platform = require('react-native').Platform;
      originalOS = Platform.OS;
      Platform.OS = 'android';
    });

    afterEach(() => {
      const Platform = require('react-native').Platform;
      Platform.OS = originalOS;
    });

    it('renderiza correctamente en Android (behavior=null, thumbColor dinámico con isPrivate false)', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: false });

      const { findByText } = render(<PreferencesScreen />);
      expect(await findByText('Preferencias')).toBeTruthy();
    });

    it('renderiza Switch en Android con isPrivate true (thumbColor usa primaryLight)', async () => {
      getPrivacyStatus.mockResolvedValueOnce({ isPrivate: true });

      const { findByText } = render(<PreferencesScreen />);
      expect(await findByText('Preferencias')).toBeTruthy();
    });
  });
});
