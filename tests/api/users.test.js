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

  it('deleteProfilePhoto calls delete /users/avatar', async () => {
    apiClient.delete.mockResolvedValueOnce({});
    await usersApi.deleteProfilePhoto();
    expect(apiClient.delete).toHaveBeenCalledWith('/users/avatar');
  });

  it('prepareAvatarUpload calls post /users/avatar/prepare con mimeType', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { signedUrl: 'https://supabase.co/sign', filename: 'u-123.jpg' } });
    await usersApi.prepareAvatarUpload('image/jpeg');
    expect(apiClient.post).toHaveBeenCalledWith('/users/avatar/prepare', { mimeType: 'image/jpeg' });
  });

  it('confirmAvatarUpload calls post /users/avatar/confirm con filename', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { profile_photo_url: 'https://supabase.co/u-123.jpg' } });
    await usersApi.confirmAvatarUpload('u-123.jpg');
    expect(apiClient.post).toHaveBeenCalledWith('/users/avatar/confirm', { filename: 'u-123.jpg' });
  });
});
