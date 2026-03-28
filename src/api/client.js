import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lee la URL de la API del archivo .env (prefijo EXPO_PUBLIC_)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor de request: inyecta el token JWT en cada petición si existe
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response: extrae el mensaje de error del backend
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Ocurrió un error inesperado.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
