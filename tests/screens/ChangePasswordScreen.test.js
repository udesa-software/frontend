import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ChangePasswordScreen } from '../../src/screens/ChangePasswordScreen';
import { authApi } from '../../src/api/auth';
import { useAuth } from '../../src/context/AuthContext';

// ─── Mocks ───────────────────────────────────────────────────────────────────
jest.mock('../../src/api/auth', () => ({
  authApi: {
    changePassword: jest.fn(),
  },
}));

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const mockClearLocalSession = jest.fn();

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      clearLocalSession: mockClearLocalSession,
    });
    // Mock Alert.alert to execute the callback if needed
    jest.spyOn(Alert, 'alert');
  });

  it('renders correctly with all fields and buttons', () => {
    const { getByText, getByPlaceholderText } = render(<ChangePasswordScreen />);
    
    expect(getByText('Cambiar Contraseña')).toBeTruthy();
    expect(getByPlaceholderText('Ingresa tu clave actual')).toBeTruthy();
    expect(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.')).toBeTruthy();
    expect(getByPlaceholderText('Repite tu nueva contraseña')).toBeTruthy();
    expect(getByText('Actualizar Contraseña')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
  });

  it('shows error if current password is empty', async () => {
    const { getByText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La contraseña actual es obligatoria')).toBeTruthy();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('shows error if new password is empty', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'current123');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La nueva contraseña es obligatoria')).toBeTruthy();
  });

  it('shows error if new password is too short', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'current123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'short');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La nueva contraseña debe tener al menos 8 caracteres')).toBeTruthy();
  });

  it('shows error if new password lacks uppercase', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'current123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'alllowercase1');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La nueva contraseña debe contener al menos una mayúscula')).toBeTruthy();
  });

  it('shows error if new password lacks number', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'current123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NoNumberPass');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La nueva contraseña debe contener al menos un número')).toBeTruthy();
  });

  it('shows error if new password is same as current', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'SamePass123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'SamePass123');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('La nueva contraseña no puede ser igual a la anterior')).toBeTruthy();
  });

  it('shows error if passwords do not match', async () => {
    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'current123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NewPass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'DifferentPass123');
    fireEvent.press(getByText('Actualizar Contraseña'));
    
    expect(await findByText('Las contraseñas no coinciden')).toBeTruthy();
  });

  it('calls changePassword and shows success alert on valid input', async () => {
    authApi.changePassword.mockResolvedValueOnce({
      data: { message: 'Contraseña cambiada exitosamente' }
    });

    const { getByText, getByPlaceholderText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'OldPass123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NewPass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'NewPass123');
    
    await act(async () => {
      fireEvent.press(getByText('Actualizar Contraseña'));
    });
    
    expect(authApi.changePassword).toHaveBeenCalledWith('OldPass123', 'NewPass123', 'NewPass123');
    expect(Alert.alert).toHaveBeenCalledWith('Éxito', 'Contraseña cambiada exitosamente', expect.any(Array));
  });

  it('clears session when clicking alert button after success', async () => {
    authApi.changePassword.mockResolvedValueOnce({
      data: { message: 'Success' }
    });
    
    // Simulate clicking the "Entendido" button in the Alert
    Alert.alert.mockImplementationOnce((title, message, buttons) => {
      buttons[0].onPress();
    });

    const { getByText, getByPlaceholderText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'OldPass123');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NewPass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'NewPass123');
    
    await act(async () => {
      fireEvent.press(getByText('Actualizar Contraseña'));
    });
    
    expect(mockClearLocalSession).toHaveBeenCalled();
  });

  it('handles general API errors', async () => {
    authApi.changePassword.mockRejectedValueOnce({
      response: { data: { message: 'La contraseña actual es incorrecta' } }
    });

    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'WrongPass');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NewPass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'NewPass123');
    
    await act(async () => {
      fireEvent.press(getByText('Actualizar Contraseña'));
    });
    
    expect(await findByText('La contraseña actual es incorrecta')).toBeTruthy();
  });

  it('handles account lockout error (423)', async () => {
    authApi.changePassword.mockRejectedValueOnce({
      response: { data: { message: 'Cuenta bloqueada temporalmente' } }
    });

    const { getByText, getByPlaceholderText, findByText } = render(<ChangePasswordScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Ingresa tu clave actual'), 'WrongPass');
    fireEvent.changeText(getByPlaceholderText('Mín. 8 caracteres, 1 mayús., 1 núm.'), 'NewPass123');
    fireEvent.changeText(getByPlaceholderText('Repite tu nueva contraseña'), 'NewPass123');
    
    await act(async () => {
      fireEvent.press(getByText('Actualizar Contraseña'));
    });
    
    expect(await findByText('Cuenta bloqueada temporalmente')).toBeTruthy();
  });

  it('navigates back when pressing Cancelar', () => {
    const { getByText } = render(<ChangePasswordScreen />);
    fireEvent.press(getByText('Cancelar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
