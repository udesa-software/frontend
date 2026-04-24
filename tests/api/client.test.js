import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Mock axios BEFORE importing client
jest.mock('axios', () => {
  const m = jest.fn(() => Promise.resolve());
  m.create = jest.fn(() => m);
  m.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  m.post = jest.fn();
  m.get = jest.fn();
  m.patch = jest.fn();
  m.delete = jest.fn();
  m.defaults = { headers: { common: {} } };
  return m;
});

// Import apiClient (which will be the 'm' function from the mock)
import apiClient from '../../src/api/client';

// Extract handlers immediately after import
const requestInterceptor = apiClient.interceptors.request.use.mock.calls[0][0];
const responseErrorInterceptor = apiClient.interceptors.response.use.mock.calls[0][1];

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('apiClient Interceptors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header if token exists in AsyncStorage', async () => {
      await AsyncStorage.setItem('authToken', 'test-token');
      const config = { headers: {} };
      const result = await requestInterceptor(config);
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should NOT add Authorization header if token does NOT exist', async () => {
      const config = { headers: {} };
      const result = await requestInterceptor(config);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - 401 Refresh Logic', () => {
    it('should attempt to refresh token on 401 "Token inválido o expirado"', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');
      // axios.post is also 'm.post' in our mock
      axios.post.mockResolvedValueOnce({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      });
      // apiClient is 'm'
      apiClient.mockResolvedValueOnce({ data: 'success' });

      const result = await responseErrorInterceptor(originalRequest);

      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
        refreshToken: 'refresh-token'
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-access-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
      expect(result.data).toBe('success');
    });

    it('should clear session if refresh fails', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');
      axios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Refresh failed');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userData');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    });

    it('should not attempt refresh if it is already a retry', async () => {
      const originalRequest = {
        config: { _retry: true, headers: {} },
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Token inválido o expirado');
      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should not attempt refresh if status is not 401', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 400,
          data: { error: 'Bad Request' }
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Bad Request');
      expect(axios.post).not.toHaveBeenCalled();
    });
  });
});
