import apiClient from './client';

export const usersApi = {
  // POST /api/users/register
  register: (username, email, password, acceptedTerms) =>
    apiClient.post('/users/register', { username, email, password, acceptedTerms }),

  // GET /api/users/verify-email?token=<uuid>
  verifyEmail: (token) =>
    apiClient.get('/users/verify-email', { params: { token } }),

  // POST /api/users/resend-verification
  resendVerification: (email) =>
    apiClient.post('/users/resend-verification', { email }),

  // POST /api/users/delete
  deleteAccount: (password) =>
    apiClient.post('/users/delete', { password }),
};
