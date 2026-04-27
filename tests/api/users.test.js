import { usersApi } from '../../src/api/users';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
}));

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
    expect(apiClient.get).toHaveBeenCalledWith('/users/search', { params: { username: 'mateo' } });
  });
});
