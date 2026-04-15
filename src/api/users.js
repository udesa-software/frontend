import apiClient from './client';

export const usersApi = {
  // POST /api/users/register
  register: (username, email, password, acceptedTerms) =>
    apiClient.post('/users/register', { username, email, password, acceptedTerms }),

  // POST /api/users/delete
  deleteAccount: (password) =>
    apiClient.post('/users/delete', { password }),

  // PATCH /api/users/profile - H6
  updateProfile: (data) =>
    apiClient.patch('/users/profile', data),
};
