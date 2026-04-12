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
    // Creamos un objeto de error enriquecido
    const responseData = error.response?.data;
    const status = error.response?.status;

    const message =
      responseData?.message ||
      responseData?.error ||
      responseData?.detail ||
      (typeof responseData === 'string' ? responseData : null) ||
      'Ocurrió un error inesperado.';

    // Creamos una instancia de Error personalizada
    const customError = new Error(message);
    customError.status = status;
    customError.details = responseData?.details || null; // El objeto con errores por campo

    return Promise.reject(customError);
  }
);

export default apiClient;
