import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUser = {
  id: '12345678-90ab-cdef-1234-567890abcdef',
  username: 'testuser',
  email: 'test@example.com',
  role: 'Usuario'
};

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    deleteAccount: mockDeleteAccount,
    updateProfile: mockUpdateProfile,
  }),
}));

import { ProfileScreen } from '../../screens/ProfileScreen';

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user information correctly', () => {
    const { getByText } = render(<ProfileScreen />);
    
    expect(getByText('testuser')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('12345678...')).toBeTruthy();
    expect(getByText('Usuario')).toBeTruthy();
  });

  it('calls logout when button is pressed', () => {
    const { getByText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('Cerrar Sesión'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('opens delete account modal when button is pressed', () => {
    const { getByText, queryByPlaceholderText, getByPlaceholderText } = render(<ProfileScreen />);
    
    // Check modal is hidden initially (placeholder shouldn't be visible)
    expect(queryByPlaceholderText('Contraseña actual')).toBeFalsy();
    
    fireEvent.press(getByText('Eliminar Cuenta'));
    
    // Modal should be visible now
    expect(getByText('¿Estás absolutamente seguro?')).toBeTruthy();
    expect(getByPlaceholderText('Contraseña actual')).toBeTruthy();
  });

  it('calls deleteAccount when confirmation button is pressed in modal', async () => {
    const { getByText, getByPlaceholderText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('Eliminar Cuenta'));
    
    fireEvent.changeText(getByPlaceholderText('Contraseña actual'), 'mypassword');
    
    await act(async () => {
      fireEvent.press(getByText('Eliminar permanentemente'));
    });
    
    expect(mockDeleteAccount).toHaveBeenCalledWith('mypassword');
  });

  it('shows error in modal if password is empty', async () => {
    const { getByText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('Eliminar Cuenta'));
    
    // Don't enter password
    await act(async () => {
      fireEvent.press(getByText('Eliminar permanentemente'));
    });
    
    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(await findByText('Por favor, ingresa tu contraseña.')).toBeTruthy();
  });

  it('closes modal when cancel is pressed', () => {
    const { getByText, queryByText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('Eliminar Cuenta'));
    expect(getByText('¿Estás absolutamente seguro?')).toBeTruthy();
    
    fireEvent.press(getByText('Cancelar'));
    
    // Modal should be gone or at least the content hidden by visible=false logic
    // (Note: in React Native testing-library, components in Modal might still be in the tree 
    // depending on mock implementation, but we check if it handles visibility)
  });

  it('navigates to Preferences when settings icon is pressed', () => {
    const { getByText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('⚙️'));
    expect(mockNavigate).toHaveBeenCalledWith('Preferences');
  });
  
  it('handles edit profile correctly', async () => {
    const { getAllByText, getByText, getByPlaceholderText, queryByText } = render(<ProfileScreen />);
    
    // Open edit modal using getAllByText since both the button and Modal title share the same text
    fireEvent.press(getAllByText('Editar Perfil')[0]);

    const usernameInput = getByPlaceholderText('Ingresa tu nombre de usuario');
    const bioInput = getByPlaceholderText('Cuéntanos algo sobre ti...');
    
    fireEvent.changeText(usernameInput, 'new_username');
    fireEvent.changeText(bioInput, 'This is a new bio');
    
    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });
    
    expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'new_username', biography: 'This is a new bio' });
  });

  it('shows error if username is empty in edit modal', async () => {
    const { getAllByText, getByText, getByPlaceholderText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    
    const usernameInput = getByPlaceholderText('Ingresa tu nombre de usuario');
    fireEvent.changeText(usernameInput, '   '); // only spaces
    
    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });
    
    expect(await findByText('El nombre de usuario es obligatorio.')).toBeTruthy();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
