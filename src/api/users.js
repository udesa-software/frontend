import apiClient from './client';

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

  // H8 paso 1: pide una signed URL a Supabase para subir directo (bypassa AWS WAF del ALB)
  prepareAvatarUpload: (mimeType) =>
    apiClient.post('/users/avatar/prepare', { mimeType }),

  // H8 paso 2: confirma al backend que la subida a Supabase fue exitosa
  confirmAvatarUpload: (filename) =>
    apiClient.post('/users/avatar/confirm', { filename }),

  // H12: Foto de perfil — borrado
  deleteProfilePhoto: () =>
    apiClient.delete('/users/avatar'),

  // Perfil público de cualquier usuario (username, biography, is_online)
  getUserPublicProfile: (userId) =>
    apiClient.get(`/users/${userId}/profile`),
};
