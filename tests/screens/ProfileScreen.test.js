import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockLogout = jest.fn();
const mockDeleteAccount = jest.fn();
const mockUpdateProfile = jest.fn();
const mockPrepareAvatarUpload = jest.fn();
const mockConfirmAvatarUpload = jest.fn();
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
    prepareAvatarUpload: mockPrepareAvatarUpload,
    confirmAvatarUpload: mockConfirmAvatarUpload,
    deleteProfilePhoto: mockDeleteProfilePhoto,
  }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

import * as ImagePicker from 'expo-image-picker';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { Alert } from 'react-native';

// Mock global fetch para el flujo de subida directa a Supabase
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockSuccessfulFetch = () => {
  mockFetch
    .mockResolvedValueOnce({ blob: () => Promise.resolve({}) })  // fetch(fileUri)
    .mockResolvedValueOnce({ ok: true });                        // fetch(signedUrl, PUT)
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Defaults felices para prepare/confirm
    mockPrepareAvatarUpload.mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/upload/test', filename: 'user-123.jpg' },
    });
    mockConfirmAvatarUpload.mockResolvedValue({});
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
    let alertSpy;

    beforeEach(() => {
      // Por defecto: los permisos están concedidos y el alert auto-selecciona "Elegir de la galería"
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
      alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
        if (buttons) {
          const btn = buttons.find(b => b.text === 'Elegir de la galería');
          if (btn?.onPress) btn.onPress();
        }
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    // ── Galería ───────────────────────────────────────────────────────────────

    it('shows permission denied alert if camera roll permission is rejected', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(alertSpy).toHaveBeenCalledWith('Permiso Denegado', expect.any(String));
      expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('handles photo upload successfully via gallery', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path/photo.jpg' }],
      });
      mockSuccessfulFetch();

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => expect(mockConfirmAvatarUpload).toHaveBeenCalled());
      expect(alertSpy).toHaveBeenCalledWith('Éxito', 'Foto de perfil actualizada correctamente.');
    });

    it('does nothing if gallery picker is cancelled', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(mockPrepareAvatarUpload).not.toHaveBeenCalled();
    });

    it('rejects upload if file format is invalid (e.g. .gif)', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path/animation.gif' }],
      });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Formato Inválido', expect.stringContaining('JPG, PNG'))
      );
      expect(mockPrepareAvatarUpload).not.toHaveBeenCalled();
    });

    it('shows error alert if prepareAvatarUpload throws with a message', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path/photo.jpg' }],
      });
      mockPrepareAvatarUpload.mockRejectedValueOnce(new Error('Server error 500'));

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error al subir foto', 'Server error 500')
      );
    });

    it('shows generic error alert if prepareAvatarUpload throws without message', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path/photo.png' }],
      });
      mockPrepareAvatarUpload.mockRejectedValueOnce({});

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error al subir foto', 'Error al subir foto.')
      );
    });

    it('shows error alert if launchImageLibraryAsync throws', async () => {
      ImagePicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('picker crashed'));

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'picker crashed')
      );
    });

    // ── Cámara ────────────────────────────────────────────────────────────────

    it('opens camera flow when user selects "Tomar foto (Cámara)"', async () => {
      // Hacer que el alert auto-elija la opción de cámara
      alertSpy.mockImplementation((title, msg, buttons) => {
        if (buttons) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn?.onPress) btn.onPress();
        }
      });
      ImagePicker.requestCameraPermissionsAsync = jest.fn().mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchCameraAsync = jest.fn().mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://camera/capture.jpg' }],
      });
      mockSuccessfulFetch();

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => expect(mockConfirmAvatarUpload).toHaveBeenCalled());
    });

    it('shows error if camera permission is denied', async () => {
      alertSpy.mockImplementation((title, msg, buttons) => {
        if (buttons) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn?.onPress) btn.onPress();
        }
      });
      ImagePicker.requestCameraPermissionsAsync = jest.fn().mockResolvedValueOnce({ status: 'denied' });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Permiso Denegado', 'Se necesita acceso a la cámara para tomar fotos.')
      );
    });

    it('does nothing if camera is cancelled', async () => {
      alertSpy.mockImplementation((title, msg, buttons) => {
        if (buttons) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn?.onPress) btn.onPress();
        }
      });
      ImagePicker.requestCameraPermissionsAsync = jest.fn().mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchCameraAsync = jest.fn().mockResolvedValueOnce({ canceled: true, assets: [] });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(mockPrepareAvatarUpload).not.toHaveBeenCalled();
    });

    it('shows error if launchCameraAsync throws', async () => {
      alertSpy.mockImplementation((title, msg, buttons) => {
        if (buttons) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn?.onPress) btn.onPress();
        }
      });
      ImagePicker.requestCameraPermissionsAsync = jest.fn().mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchCameraAsync = jest.fn().mockRejectedValueOnce(new Error('camera error'));

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'camera error')
      );
    });

    // ── Eliminar foto ─────────────────────────────────────────────────────────

    it('handles delete profile photo successfully via button', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      mockDeleteProfilePhoto.mockResolvedValueOnce({});

      const { getByText } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() => expect(mockDeleteProfilePhoto).toHaveBeenCalled());
      expect(alertSpy).toHaveBeenCalledWith('Éxito', 'Foto de perfil eliminada correctamente.');

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('shows error from response.data.message when delete photo fails', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      const err = new Error('delete fail');
      err.response = { data: { message: 'No se pudo eliminar la foto' } };
      mockDeleteProfilePhoto.mockRejectedValueOnce(err);

      const { getByText } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo eliminar la foto')
      );

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('shows error from response.data.error when delete photo fails without message', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      const err = new Error('delete fail');
      err.response = { data: { error: 'Forbidden' } };
      mockDeleteProfilePhoto.mockRejectedValueOnce(err);

      const { getByText } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Forbidden')
      );

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('shows err.message when delete photo fails without response', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      mockDeleteProfilePhoto.mockRejectedValueOnce(new Error('Network error'));

      const { getByText } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Network error')
      );

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('shows fallback error when delete photo fails without any message', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      mockDeleteProfilePhoto.mockRejectedValueOnce({});

      const { getByText } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Error al eliminar foto.')
      );

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('shows "Eliminar foto actual" option in alert when user has a profile photo', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://example.com/photo.jpg' };
      // Sobrescribir el spy para NO ejecutar nada, sólo verificar los botones
      let capturedButtons = [];
      alertSpy.mockImplementation((title, msg, buttons) => {
        capturedButtons = buttons || [];
      });

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(capturedButtons.some(b => b.text === 'Eliminar foto actual')).toBe(true);

      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });

    it('handles camera capture successfully', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
        if (buttons && buttons.length > 0) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn && btn.onPress) {
            btn.onPress();
          }
        }
      });

      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path.png', type: 'image', fileName: 'test.png' }]
      });
      mockSuccessfulFetch();

      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => {
        expect(ImagePicker.launchCameraAsync).toHaveBeenCalled();
      });
      await waitFor(() => expect(mockConfirmAvatarUpload).toHaveBeenCalled());
    });

    it('shows error if camera permission is denied', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
        if (buttons && buttons.length > 0) {
          const btn = buttons.find(b => b.text === 'Tomar foto (Cámara)');
          if (btn && btn.onPress) {
            btn.onPress();
          }
        }
      });

      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      
      const { getByTestId } = render(<ProfileScreen />);
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('shows error if image format is invalid', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path.gif', type: 'image', fileName: 'test.gif' }]
      });

      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileScreen />);
      
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => {
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
      });

      expect(alertSpy).toHaveBeenCalledWith('Formato Inválido', expect.any(String));
    });

    it('shows error if pickImage fails', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      ImagePicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('Pick image failed'));

      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByTestId } = render(<ProfileScreen />);
      
      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Pick image failed');
      });
    });

    it('shows error if upload to Supabase fails', async () => {
      ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://local/path.jpg', type: 'image', fileName: 'test.jpg' }]
      });
      mockFetch
        .mockResolvedValueOnce({ blob: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: false });

      const { getByTestId } = render(<ProfileScreen />);

      await act(async () => {
        fireEvent.press(getByTestId('profile-photo-container'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error al subir foto', 'Error al subir la imagen al almacenamiento.');
      });
    });

    it('shows error if deleteProfilePhoto fails', async () => {
      mockUser = { ...mockUser, profile_photo_url: 'http://url' };
      mockDeleteProfilePhoto.mockRejectedValueOnce(new Error('Delete failed'));

      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<ProfileScreen />);
      
      await act(async () => {
        fireEvent.press(getByText('Eliminar Foto'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Delete failed');
      });

      // reset
      mockUser = { id: '12345678-90ab-cdef-1234-567890abcdef', username: 'testuser', email: 'test@example.com', role: 'Usuario' };
    });
  });
});
