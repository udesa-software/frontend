import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('../../api/users', () => ({
  usersApi: {
    register: jest.fn(),
  },
}));

import { usersApi } from '../../api/users';
import { RegisterScreen } from '../../screens/RegisterScreen';

const defaultNavigation = { navigate: mockNavigate };
const renderScreen = () => render(<RegisterScreen navigation={defaultNavigation} />);

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders all key UI elements', () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
    expect(getByTestId('register-title')).toBeTruthy();
    expect(getByText('Únete para disfrutar de la experiencia')).toBeTruthy();
    expect(getByPlaceholderText('Mínimo 4 caracteres')).toBeTruthy();
    expect(getByPlaceholderText('ejemplo@correo.com')).toBeTruthy();
    expect(getByPlaceholderText('Al menos 8 caracteres')).toBeTruthy();
  });

  it('calls usersApi.register with correct arguments on submit', async () => {
    usersApi.register.mockResolvedValueOnce({ data: {} });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Mínimo 4 caracteres'), 'johndoe');
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'john@test.com');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    expect(usersApi.register).toHaveBeenCalledWith(
      'johndoe',
      'john@test.com',
      'password123',
      true
    );
  });

  it('shows success Alert and navigates to Login on successful registration', async () => {
    usersApi.register.mockResolvedValueOnce({ data: {} });
    Alert.alert.mockImplementationOnce((title, msg, buttons) => {
      // Simulate user pressing "Ir al Login"
      buttons?.[0]?.onPress?.();
    });

    const { getByPlaceholderText, getByTestId } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Mínimo 4 caracteres'), 'johndoe');
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'john@test.com');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      '¡Registro Exitoso!',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockNavigate).toHaveBeenCalledWith('Login', { showResendPrompt: true });
  });

  it('displays general error when registration fails', async () => {
    usersApi.register.mockRejectedValueOnce(new Error('El email ya está registrado'));

    const { getByPlaceholderText, getByTestId, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Mínimo 4 caracteres'), 'johndoe');
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'existing@test.com');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    expect(await findByText('El email ya está registrado')).toBeTruthy();
  });

  it('displays field-level errors when registration returns details', async () => {
    const err = new Error('Validation');
    err.details = { username: ['Username demasiado corto'] };
    usersApi.register.mockRejectedValueOnce(err);

    const { getByPlaceholderText, getByTestId, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Mínimo 4 caracteres'), 'ab');
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'ab@test.com');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    expect(await findByText('Username demasiado corto')).toBeTruthy();
  });

  it('shows default error message when error has no message', async () => {
    usersApi.register.mockRejectedValueOnce(new Error());

    const { getByPlaceholderText, getByTestId, findByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Mínimo 4 caracteres'), 'johndoe');
    fireEvent.changeText(getByPlaceholderText('ejemplo@correo.com'), 'john@test.com');
    fireEvent.changeText(getByPlaceholderText('Al menos 8 caracteres'), 'password123');

    await act(async () => {
      fireEvent.press(getByTestId('register-button'));
    });

    expect(await findByText('Error al intentar crear la cuenta')).toBeTruthy();
  });

  it('navigates to Login when "Iniciar Sesión" link is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Iniciar Sesión'));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });
});
