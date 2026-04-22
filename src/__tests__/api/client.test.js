import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../../api/client';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    post: jest.fn(),
  };
});

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
      
      // Get the request interceptor handler
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
      
      const config = { headers: {} };
      const result = await requestInterceptor(config);
      
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should NOT add Authorization header if token does NOT exist', async () => {
      const requestInterceptor = apiClient.interceptors.request.handlers[0].fulfilled;
      
      const config = { headers: {} };
      const result = await requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - 401 Refresh Logic', () => {
    const responseErrorInterceptor = apiClient.interceptors.response.handlers[0].rejected;

    it('should attempt to refresh token on 401 "Token inválido o expirado"', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');
      axios.post.mockResolvedValueOnce({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      });

      // We need to mock apiClient itself since it's called recursively
      // But for this unit test, we just want to see if it calls axios.post and stores the token
      
      try {
        await responseErrorInterceptor(originalRequest);
      } catch (e) {
        // It might still fail because we didn't fully mock the retry call, 
        // but we can check if the refresh happened.
      }

      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
        refreshToken: 'refresh-token'
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('authToken', 'new-access-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'new-refresh-token');
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
