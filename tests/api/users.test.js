import { usersApi } from '../../src/api/users';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('usersApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getPreferences calls get /users/preferences', async () => {
    apiClient.get.mockResolvedValueOnce({ data: {} });
    await usersApi.getPreferences();
    expect(apiClient.get).toHaveBeenCalledWith('/users/preferences');
  });

  it('updatePreferences calls patch /users/preferences', async () => {
    apiClient.patch.mockResolvedValueOnce({ data: {} });
    await usersApi.updatePreferences({ theme: 'dark' });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/preferences', { theme: 'dark' });
  });

  it('updateProfile calls patch /users/profile', async () => {
    apiClient.patch.mockResolvedValueOnce({ data: {} });
    await usersApi.updateProfile({ biography: 'Hola' });
    expect(apiClient.patch).toHaveBeenCalledWith('/users/profile', { biography: 'Hola' });
  });

  it('search calls get /users/search', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    await usersApi.search('mateo');
    expect(apiClient.get).toHaveBeenCalledWith('/users/search', { params: { q: 'mateo' } });
  });

  it('heartbeat calls post /users/heartbeat', async () => {
    apiClient.post.mockResolvedValueOnce({});
    await usersApi.heartbeat();
    expect(apiClient.post).toHaveBeenCalledWith('/users/heartbeat');
  });

  it('heartbeat no pasa body al endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({});
    await usersApi.heartbeat();
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/users/heartbeat');
  });

  it('deleteProfilePhoto calls delete /users/profile-photo', async () => {
    apiClient.delete.mockResolvedValueOnce({});
    await usersApi.deleteProfilePhoto();
    expect(apiClient.delete).toHaveBeenCalledWith('/users/profile-photo');
  });

  describe('uploadProfilePhoto', () => {
    let mockXHR;
    beforeEach(() => {
      mockXHR = {
        open: jest.fn(),
        setRequestHeader: jest.fn(),
        send: jest.fn(),
      };
      global.XMLHttpRequest = jest.fn(() => mockXHR);
      AsyncStorage.getItem.mockResolvedValue('fake-token');
    });

    it('resolves on successful upload', async () => {
      const promise = usersApi.uploadProfilePhoto(new FormData());
      await new Promise(process.nextTick);
      mockXHR.status = 200;
      mockXHR.responseText = JSON.stringify({ profile_photo_url: 'http://url' });
      mockXHR.onload();
      
      const response = await promise;
      expect(response.data.profile_photo_url).toBe('http://url');
      expect(mockXHR.open).toHaveBeenCalledWith('POST', expect.stringContaining('/users/profile-photo'));
      expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer fake-token');
      expect(mockXHR.send).toHaveBeenCalled();
    });

    it('rejects with server error message if status is not 2xx', async () => {
      const promise = usersApi.uploadProfilePhoto(new FormData());
      await new Promise(process.nextTick);
      mockXHR.status = 400;
      mockXHR.responseText = JSON.stringify({ message: 'Formato inválido' });
      mockXHR.onload();
      
      await expect(promise).rejects.toThrow('Formato inválido');
    });

    it('rejects with fallback error message if status is not 2xx', async () => {
      const promise = usersApi.uploadProfilePhoto(new FormData());
      await new Promise(process.nextTick);
      mockXHR.status = 500;
      mockXHR.responseText = JSON.stringify({ error: 'Fallo interno' });
      mockXHR.onload();
      
      await expect(promise).rejects.toThrow('Fallo interno');
    });

    it('rejects with generic error if response is not json', async () => {
      const promise = usersApi.uploadProfilePhoto(new FormData());
      await new Promise(process.nextTick);
      mockXHR.responseText = 'Internal Server Error';
      mockXHR.onload();
      
      await expect(promise).rejects.toThrow('Error al procesar la respuesta del servidor.');
    });

    it('rejects on network error', async () => {
      const promise = usersApi.uploadProfilePhoto(new FormData());
      await new Promise(process.nextTick);
      mockXHR.onerror();
      
      await expect(promise).rejects.toThrow('Error de red al subir la foto.');
    });
  });
});
