import apiClient from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const usersApi = {
  // POST /api/users/register
  register: (username, email, password, acceptedTerms) =>
    apiClient.post('/users/register', { username, email, password, acceptedTerms }),

  // POST /api/users/delete
  deleteAccount: (password) =>
    apiClient.post('/users/delete', { password }),

  // GET /api/users/preferences
  getPreferences: () =>
    apiClient.get('/users/preferences'),

  // PATCH /api/users/preferences
  updatePreferences: (data) =>
    apiClient.patch('/users/preferences', data),

  // PATCH /api/users/profile - H6
  updateProfile: (data) =>
    apiClient.patch('/users/profile', data),

  // GET /api/users/search
  search: (q) =>
    apiClient.get('/users/search', { params: { q } }),

  // H10 CA.1: heartbeat
  heartbeat: () =>
    apiClient.post('/users/heartbeat'),

  uploadProfilePhoto: (formData) =>
    new Promise(async (resolve, reject) => {
      const token = await AsyncStorage.getItem('authToken');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/users/profile-photo`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ data });
          } else {
            reject(new Error(data.message || data.error || 'Error al subir foto.'));
          }
        } catch {
          reject(new Error('Error al procesar la respuesta del servidor.'));
        }
      };

      xhr.onerror = () => reject(new Error('Error de red al subir la foto.'));
      xhr.send(formData);
    }),

  // H12: Foto de perfil — borrado
  deleteProfilePhoto: () =>
    apiClient.delete('/users/profile-photo'),
};
