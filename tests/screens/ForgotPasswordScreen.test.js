import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('../../src/api/auth', () => ({
  authApi: {
    forgotPassword: jest.fn(),
  },
}));

import { authApi } from '../../src/api/auth';
import { ForgotPasswordScreen } from '../../src/screens/ForgotPasswordScreen';

const defaultNavigation = { navigate: mockNavigate };
const renderScreen = () =>
  render(<ForgotPasswordScreen navigation={defaultNavigation} />);

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form view initially', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    expect(getByText('Recuperar Clave')).toBeTruthy();
    expect(getByPlaceholderText('ejemplo@correo.com')).toBeTruthy();
    expect(getByText('Enviar Instrucciones')).toBeTruthy();
  });

  it('shows error when submit is pressed with empty identifier', async () => {
    const { getByText, findByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText('Enviar Instrucciones'));
    });

    expect(await findByText('Por favor, ingresa tu email o usuario.')).toBeTruthy();
  });

  it('shows success view after successful request', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({});

    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'user@test.com');

    await act(async () => {
      fireEvent.press(getByText('Enviar Instrucciones'));
    });

    expect(await findByText('¡Solicitud enviada!')).toBeTruthy();
    expect(authApi.forgotPassword).toHaveBeenCalledWith('user@test.com');
  });

  it('shows success view even when API returns 404 (security - avoid enumeration)', async () => {
    const err = new Error('Not found');
    err.status = 404;
    authApi.forgotPassword.mockRejectedValueOnce(err);

    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'nouser@test.com');

    await act(async () => {
      fireEvent.press(getByText('Enviar Instrucciones'));
    });

    expect(await findByText('¡Solicitud enviada!')).toBeTruthy();
  });

  it('shows error message for non-404 API errors', async () => {
    const err = new Error('Error del servidor');
    err.status = 500;
    authApi.forgotPassword.mockRejectedValueOnce(err);

    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'user@test.com');

    await act(async () => {
      fireEvent.press(getByText('Enviar Instrucciones'));
    });

    expect(await findByText('Error del servidor')).toBeTruthy();
  });

  it('navigates to Login from form view', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Volver al Login'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('navigates to Login from success view', async () => {
    authApi.forgotPassword.mockResolvedValueOnce({});

    const { getByPlaceholderText, getByText, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'user@test.com');

    await act(async () => {
      fireEvent.press(getByText('Enviar Instrucciones'));
    });

    // Wait for success view
    const backBtn = await findByText('Volver al Login');
    fireEvent.press(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
