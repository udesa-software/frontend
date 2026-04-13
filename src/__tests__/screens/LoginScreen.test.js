import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockLogin = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../api/auth', () => ({
  authApi: {
    resendVerification: jest.fn(),
  },
}));

import { authApi } from '../../api/auth';
import { LoginScreen } from '../../screens/LoginScreen';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const defaultNavigation = { navigate: mockNavigate };
const defaultRoute = { params: {} };

const renderScreen = (routeParams = {}) =>
  render(
    <LoginScreen
      navigation={defaultNavigation}
      route={{ params: routeParams }}
    />
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all key UI elements', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    expect(getByText('Bienvenido')).toBeTruthy();
    expect(getByText('Inicia sesión para continuar')).toBeTruthy();
    expect(getByPlaceholderText('ejemplo@correo.com o mi_usuario')).toBeTruthy();
    expect(getByPlaceholderText('Tu contraseña secreta')).toBeTruthy();
    expect(getByText('Iniciar Sesión')).toBeTruthy();
  });

  it('updates identifier and password fields on user input', () => {
    const { getByPlaceholderText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com o mi_usuario'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Tu contraseña secreta'), 'password123');
    // No assertion needed - just verifies no crash
  });

  it('calls login with identifier and password on submit', async () => {
    mockLogin.mockResolvedValueOnce({});
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com o mi_usuario'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Tu contraseña secreta'), 'secret123');

    await act(async () => {
      fireEvent.press(getByText('Iniciar Sesión'));
    });

    expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret123');
  });

  it('displays general error message on failed login', async () => {
    const error = new Error('Credenciales inválidas');
    mockLogin.mockRejectedValueOnce(error);
    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com o mi_usuario'), 'bad@test.com');
    fireEvent.changeText(getByPlaceholderText('Tu contraseña secreta'), 'wrongpass');

    await act(async () => {
      fireEvent.press(getByText('Iniciar Sesión'));
    });

    await waitFor(() => {
      expect(getByText('Credenciales inválidas')).toBeTruthy();
    });
  });

  it('shows resend button when error message contains "verific"', async () => {
    const error = new Error('Cuenta sin verificar. Por favor verifica tu correo.');
    mockLogin.mockRejectedValueOnce(error);
    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com o mi_usuario'), 'user@test.com');
    fireEvent.changeText(getByPlaceholderText('Tu contraseña secreta'), 'pass');

    await act(async () => {
      fireEvent.press(getByText('Iniciar Sesión'));
    });

    expect(await findByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('shows resend button when showResendPrompt param is true', () => {
    const { getByText } = renderScreen({ showResendPrompt: true });
    expect(getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('shows alert when resend is clicked with non-email identifier', async () => {
    const { getByText } = renderScreen({ showResendPrompt: true });

    // Identifier is empty by default (no @ sign)
    await act(async () => {
      fireEvent.press(getByText('¿No recibiste el código? Reenviar'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atención',
      expect.stringContaining('email')
    );
  });

  it('calls resendVerification when identifier is a valid email and resend is pressed', async () => {
    authApi.resendVerification.mockResolvedValueOnce({});

    const { getByPlaceholderText, getByText } = renderScreen({ showResendPrompt: true });

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com o mi_usuario'),
      'user@test.com'
    );

    await act(async () => {
      fireEvent.press(getByText('¿No recibiste el código? Reenviar'));
    });

    expect(authApi.resendVerification).toHaveBeenCalledWith('user@test.com');
    expect(Alert.alert).toHaveBeenCalledWith('¡Enviado!', expect.any(String));
  });

  it('shows success alert even on 404 when resending verification', async () => {
    const err = new Error('Not found');
    err.status = 404;
    authApi.resendVerification.mockRejectedValueOnce(err);

    const { getByPlaceholderText, getByText } = renderScreen({ showResendPrompt: true });

    fireEvent.changeText(
      getByPlaceholderText('ejemplo@correo.com o mi_usuario'),
      'unknown@test.com'
    );

    await act(async () => {
      fireEvent.press(getByText('¿No recibiste el código? Reenviar'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('¡Enviado!', expect.any(String));
  });

  it('navigates to ForgotPassword when link is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Olvidé mi contraseña'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('navigates to Register when register link is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Regístrate'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('displays field-level errors when login returns details', async () => {
    const error = new Error('Validation error');
    error.details = { identifier: ['El email no es válido'] };
    mockLogin.mockRejectedValueOnce(error);

    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com o mi_usuario'), 'bad');
    fireEvent.changeText(getByPlaceholderText('Tu contraseña secreta'), 'pass');

    await act(async () => {
      fireEvent.press(getByText('Iniciar Sesión'));
    });

    expect(await findByText('El email no es válido')).toBeTruthy();
  });
});
