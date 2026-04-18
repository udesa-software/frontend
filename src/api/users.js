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
};
