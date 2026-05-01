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
const requestErrorHandler = apiClient.interceptors.request.use.mock.calls[0][1];
const responseSuccessHandler = apiClient.interceptors.response.use.mock.calls[0][0];
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

    it('should propagate request errors via the error handler', async () => {
      const err = new Error('Request setup failed');
      await expect(requestErrorHandler(err)).rejects.toThrow('Request setup failed');
    });
  });

  describe('Response Interceptor - success handler', () => {
    it('should pass through a successful response unchanged', () => {
      const response = { data: { ok: true }, status: 200 };
      expect(responseSuccessHandler(response)).toBe(response);
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

    it('should NOT save new refreshToken if not returned by endpoint', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce('old-refresh-token');
      axios.post.mockResolvedValueOnce({
        data: { accessToken: 'new-access-token' } // no refreshToken returned
      });
      apiClient.mockResolvedValueOnce({ data: 'ok' });

      await responseErrorInterceptor(originalRequest);

      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should throw immediately if there is no refresh token in SecureStore', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce(null); // No refresh token

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('No hay refresh token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
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

    it('should handle errors with a "message" field in response data', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Internal server error');
    });

    it('should handle errors with a "detail" field in response data', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 422,
          data: { detail: 'Unprocessable entity' }
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Unprocessable entity');
    });

    it('should handle errors where responseData is a plain string', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 503,
          data: 'Service Unavailable'
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Service Unavailable');
    });

    it('should throw a friendly error when receiving a text/html response (infrastructure redirection)', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 403,
          headers: { 'content-type': 'text/html' },
          data: '<html><body>CloudFront error</body></html>'
        }
      };

      try {
        await responseErrorInterceptor(originalRequest);
      } catch (err) {
        expect(err.message).toContain('Error de conexión con el servidor');
        expect(err.status).toBe(403);
      }
    });

    it('should include details from responseData if present', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 400,
          data: { error: 'Validation error', details: { field: ['is required'] } }
        }
      };

      try {
        await responseErrorInterceptor(originalRequest);
      } catch (err) {
        expect(err.details).toEqual({ field: ['is required'] });
      }
    });

    it('should fall back to generic message when response has no useful data', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 500,
          data: {}
        }
      };

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('Ocurrió un error inesperado.');
    });

    it('should enqueue requests while a refresh is in progress and resolve them after', async () => {
      // Simulate two concurrent 401 errors. The first will own the refresh,
      // the second should be queued and resolved once the first completes.
      let resolveRefresh;
      const refreshPromise = new Promise((res) => { resolveRefresh = res; });

      SecureStore.getItemAsync.mockResolvedValue('rt');
      axios.post.mockReturnValueOnce(refreshPromise.then(() => ({
        data: { accessToken: 'fresh-token', refreshToken: 'new-rt' }
      })));
      apiClient.mockResolvedValue({ data: 'retried' });

      const request1 = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: { status: 401, data: { error: 'Token inválido o expirado' } }
      };
      const request2 = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: { status: 401, data: { error: 'Token inválido o expirado' } }
      };

      const promise1 = responseErrorInterceptor(request1);
      // While request1 is refreshing, queue request2
      const promise2 = responseErrorInterceptor(request2);

      // Now resolve the refresh
      resolveRefresh();

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.data).toBe('retried');
      expect(result2.data).toBe('retried');
    });

    it('should reject queued requests if the refresh itself fails', async () => {
      let rejectRefresh;
      const refreshPromise = new Promise((_, rej) => { rejectRefresh = rej; });

      SecureStore.getItemAsync.mockResolvedValue('rt');
      axios.post.mockReturnValueOnce(refreshPromise);
      apiClient.mockResolvedValue({ data: 'retried' });

      const request1 = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: { status: 401, data: { error: 'Token inválido o expirado' } }
      };
      const request2 = {
        config: { _retry: false, headers: {} },
        headers: {},
        response: { status: 401, data: { error: 'Token inválido o expirado' } }
      };

      const promise1 = responseErrorInterceptor(request1);
      const promise2 = responseErrorInterceptor(request2);

      // Reject the refresh
      rejectRefresh(new Error('Refresh network error'));

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });

    it('should throw if refresh response is missing accessToken', async () => {
      const originalRequest = {
        config: { _retry: false, headers: {} },
        response: {
          status: 401,
          data: { error: 'Token inválido o expirado' }
        }
      };

      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');
      // @ts-ignore
      axios.post.mockResolvedValueOnce({
        data: {} // missing accessToken
      });

      await expect(responseErrorInterceptor(originalRequest)).rejects.toThrow('No se pudo refrescar el token');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });
});
