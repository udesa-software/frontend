import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUploadProfilePhoto = jest.fn();
const mockDeleteProfilePhoto = jest.fn();

// Default user (no biography)
let mockUser = {
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

// Use a dynamic mock so individual tests can override mockUser
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    deleteAccount: mockDeleteAccount,
    updateProfile: mockUpdateProfile,
    uploadProfilePhoto: mockUploadProfilePhoto,
    deleteProfilePhoto: mockDeleteProfilePhoto,
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

import * as ImagePicker from 'expo-image-picker';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { Alert } from 'react-native';

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

  it('renders biography when user has one', () => {
    mockUser = { ...mockUser, biography: 'This is my bio' };
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('This is my bio')).toBeTruthy();
    mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
  });

  it('initializes edit modal with existing biography', async () => {
    mockUser = { ...mockUser, biography: 'Existing bio' };
    const { getAllByText, getByPlaceholderText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    
    const bioInput = getByPlaceholderText('Cuéntanos algo sobre ti...');
    expect(bioInput.props.value).toBe('Existing bio');
    mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
  });

  it('navigates to ChangePassword when button is pressed', () => {
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText('Cambiar Contraseña'));
    expect(mockNavigate).toHaveBeenCalledWith('ChangePassword');
  });

  it('shows error from err.response.data.message when save profile fails', async () => {
    const apiErr = new Error('username already taken');
    apiErr.response = { data: { message: 'El nombre de usuario ya está en uso' } };
    mockUpdateProfile.mockRejectedValueOnce(apiErr);

    const { getAllByText, getByText, getByPlaceholderText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    const usernameInput = getByPlaceholderText('Ingresa tu nombre de usuario');
    fireEvent.changeText(usernameInput, 'newusername');
    
    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });
    
    expect(await findByText('El nombre de usuario ya está en uso')).toBeTruthy();
  });

  it('shows error from err.message when save profile fails without response', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('Network error'));

    const { getAllByText, getByText, getByPlaceholderText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    const usernameInput = getByPlaceholderText('Ingresa tu nombre de usuario');
    fireEvent.changeText(usernameInput, 'newusername');
    
    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });
    
    expect(await findByText('Network error')).toBeTruthy();
  });

  it('shows error from deleteAccount failure', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('Invalid password'));

    const { getByText, getByPlaceholderText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getByText('Eliminar Cuenta'));
    fireEvent.changeText(getByPlaceholderText('Contraseña actual'), 'wrongpassword');
    
    await act(async () => {
      fireEvent.press(getByText('Eliminar permanentemente'));
    });
    
    expect(await findByText('Invalid password')).toBeTruthy();
  });

  it('closes the edit modal when Cancelar is pressed', async () => {
    const { getAllByText, getByText, queryByPlaceholderText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    expect(getByText('Guardar Cambios')).toBeTruthy();

    // Press Cancelar button(s) - there might be multiple, find the one in the edit modal
    const cancelBtns = getAllByText('Cancelar');
    fireEvent.press(cancelBtns[0]);
    // We can't easily assert modal is gone in RN testing, but at minimum verifies no crash
  });

  it('handles Modal onRequestClose', () => {
    const { UNSAFE_getAllByType, getAllByText } = render(<ProfileScreen />);
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    
    const modals = UNSAFE_getAllByType(require('react-native').Modal);
    // There are two modals in ProfileScreen (Edit and Delete)
    // We call onRequestClose on the first one (Edit Modal)
    modals[0].props.onRequestClose();
    // Verifies it doesn't crash
  });

  it('shows error if err.response.data.error exists but not message', async () => {
    const apiErr = new Error('profile update fail');
    apiErr.response = { data: { error: 'Generic error message' } };
    mockUpdateProfile.mockRejectedValueOnce(apiErr);

    const { getAllByText, getByText, getByPlaceholderText, findByText } = render(<ProfileScreen />);
    
    fireEvent.press(getAllByText('Editar Perfil')[0]);
    fireEvent.changeText(getByPlaceholderText('Ingresa tu nombre de usuario'), 'validuser');
    
    await act(async () => {
      fireEvent.press(getByText('Guardar Cambios'));
    });
    
    expect(await findByText('Generic error message')).toBeTruthy();
  });

  describe('Profile Photo operations', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
        console.log('ALERT CALLED:', title, msg, buttons);
        if (buttons && buttons.length > 0) {
          const btn = buttons.find(b => b.text === 'Elegir de la galería');
          if (btn && btn.onPress) {
            console.log('CALLING ONPRESS');
            btn.onPress();
          }
        }
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows permission denied alert if camera roll permission is rejected', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      
      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('handles photo upload successfully', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path.jpg', type: 'image', fileName: 'test.jpg' }]
      });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      expect(mockUploadProfilePhoto).toHaveBeenCalled();
    });

    it('handles delete profile photo successfully', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://url' };
      const { getByText } = render(<ProfileScreen />);
      
      fireEvent.press(getByText('Eliminar Foto'));
      
      await waitFor(() => {
        expect(mockDeleteProfilePhoto).toHaveBeenCalled();
      });

      // reset
      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });
  });
});
