import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Lee la URL de la API del archivo .env (prefijo EXPO_PUBLIC_)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Variables para manejar el refresco de token y evitar bucles
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de request: inyecta el token JWT en cada petición si existe
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response: extrae el mensaje de error del backend y maneja 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const responseData = error.response?.data;
    const status = error.response?.status;

    // Si es un 401 y el error es por token expirado, intentamos refresh
    // Evitamos reintentar si la propia petición de refresh falla (originalRequest._retry)
    if (
      status === 401 &&
      responseData?.error === 'Token inválido o expirado' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Si ya hay un refresh en curso, encolamos el pedido
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No hay refresh token');

        // Llamada directa para evitar el interceptor de request que pondría el token viejo
        // Usamos la instancia actual pero sin que el interceptor de request afecte si es posible
        // O simplemente pasamos headers vacíos si fuera necesario, pero la gateway ya admite /refresh público
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = data;

        if (accessToken) {
          await AsyncStorage.setItem('authToken', accessToken);
        } else {
          console.warn('[apiClient] Refresh falló: no se recibió accessToken');
          throw new Error('No se pudo refrescar el token');
        }
        if (newRefreshToken) {
          await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        }

        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Si falla el refresh, limpiamos sesión local
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        await SecureStore.deleteItemAsync('refreshToken');
        
        // El error se propagará y la UI podrá reaccionar (ej: redirigir a login)
        return Promise.reject(refreshError);
      }
    }

    // Detectar si la respuesta es HTML (posible redirección de infraestructura/Cloudflare)
    const contentType = error.response?.headers?.['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.warn('[apiClient] HTML response detected:', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status,
        bodyPreview: typeof responseData === 'string' ? responseData.substring(0, 300) : JSON.stringify(responseData)?.substring(0, 300),
      });
      const htmlError = new Error('Error de conexión con el servidor (Respuesta no válida). Por favor, intenta de nuevo más tarde.');
      htmlError.status = status;
      return Promise.reject(htmlError);
    }

    const message =
      responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      (typeof responseData === 'string' ? responseData : null) ||
      'Ocurrió un error inesperado.';

    const customError = new Error(message);
    customError.status = status;
    customError.details = responseData?.details || null;

    return Promise.reject(customError);
  }
);

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = BASE_URL.replace(/\/api$/, '');
  return `${base}${url}`;
};

export default apiClient;
