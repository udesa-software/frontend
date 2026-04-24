import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../src/api/auth', () => ({
  authApi: {
    verifyResetToken: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

import { authApi } from '../../src/api/auth';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { ResetPasswordScreen } from '../../src/screens/ResetPasswordScreen';

const defaultRoute = { params: { token: 'valid-token' } };
const defaultNavigation = { navigate: mockNavigate };

const renderScreen = (routeParams = defaultRoute.params) =>
  render(<ResetPasswordScreen navigation={defaultNavigation} route={{ params: routeParams }} />);

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authApi.verifyResetToken.mockReset();
    authApi.resetPassword.mockReset();
  });

  it('shows loading state while verifying token', async () => {
    authApi.verifyResetToken.mockReturnValueOnce(new Promise(() => {})); // Never resolves
    const { getByText } = renderScreen();
    expect(getByText('Verificando enlace...')).toBeTruthy();
  });

  it('shows error view when token is invalid', async () => {
    authApi.verifyResetToken.mockRejectedValueOnce(new Error('Enlace expirado'));
    const { findByText } = renderScreen();
    
    expect(await findByText('Enlace no válido')).toBeTruthy();
    expect(await findByText('Enlace expirado')).toBeTruthy();
  });

  it('shows form when token is valid', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const { getByTestId, getByPlaceholderText, findByTestId, findByPlaceholderText } = renderScreen();
    
    expect(await findByTestId('reset-password-title')).toBeTruthy();
    expect(await findByPlaceholderText('Al menos 8 caracteres')).toBeTruthy();
    expect(await findByPlaceholderText('Repite tu nueva contraseña')).toBeTruthy();
  });

  it('verifies password match before submitting', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const { getByTestId, getByPlaceholderText, findByText, findByTestId, getByText } = renderScreen();
    
    await findByTestId('reset-password-title');
    
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'different123');
    
    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });
    
    expect(await findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('calls resetPassword when passwords match and are valid', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    authApi.resetPassword.mockResolvedValueOnce({});

    const { getByTestId, getByPlaceholderText, getByText, findByTestId } = renderScreen();
    
    await findByTestId('reset-password-title');
    
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'newpassword123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'newpassword123');
    
    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });
    
    expect(authApi.resetPassword).toHaveBeenCalledWith('valid-token', 'newpassword123', 'newpassword123');
    expect(Alert.alert).toHaveBeenCalledWith('¡Éxito!', expect.any(String), expect.any(Array));
  });

  it('navigates to login after successful reset', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    authApi.resetPassword.mockResolvedValueOnce({});
    Alert.alert.mockImplementationOnce((title, msg, buttons) => {
        buttons?.[0]?.onPress?.();
    });

    const { getByTestId, getByPlaceholderText, getByText, findByTestId } = renderScreen();
    
    await findByTestId('reset-password-title');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'newpassword123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'newpassword123');
    
    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('displays API error details if present', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const error = new Error('Validation failed');
    error.details = { password: ['Contraseña muy débil'] };
    authApi.resetPassword.mockRejectedValueOnce(error);

    const { getByTestId, getByPlaceholderText, getByText, findByText, findByTestId } = renderScreen();
    
    await findByTestId('reset-password-title');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'strongpass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'strongpass123');
    
    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });
    
    expect(await findByText('Contraseña muy débil')).toBeTruthy();
  });

  it('shows "Enlace no válido" when route has no token param', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const { findByText } = renderScreen({});  // no token key

    expect(await findByText('Enlace no válido')).toBeTruthy();
    expect(await findByText('Token no encontrado en el link. Por favor, solicita uno nuevo.')).toBeTruthy();
  });

  it('navigates to ForgotPassword when "Solicitar nuevo enlace" is pressed on error view', async () => {
    authApi.verifyResetToken.mockRejectedValueOnce(new Error('Enlace expirado'));
    const { findByText } = renderScreen();

    const btn = await findByText('Solicitar nuevo enlace');
    fireEvent.press(btn);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
    });
  });

  it('shows field error when password is too short (< 8 chars)', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const { findByTestId, getByPlaceholderText, getByText, findByText } = renderScreen();

    await findByTestId('reset-password-title');

    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'short');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'short');

    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });

    expect(await findByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();
    expect(authApi.resetPassword).not.toHaveBeenCalled();
  });

  it('shows general error when resetPassword fails without details', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    authApi.resetPassword.mockRejectedValueOnce(new Error('Error del servidor'));

    const { findByTestId, getByPlaceholderText, getByText, findByText } = renderScreen();
    
    await findByTestId('reset-password-title');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'validpass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'validpass123');

    await act(async () => {
      fireEvent.press(getByText('Cambiar Contraseña'));
    });

    expect(await findByText('Error del servidor')).toBeTruthy();
  });

  it('navigates to Login when "Cancelar" button is pressed', async () => {
    authApi.verifyResetToken.mockResolvedValueOnce({});
    const { findByTestId, getByText } = renderScreen();

    await findByTestId('reset-password-title');
    fireEvent.press(getByText('Cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
