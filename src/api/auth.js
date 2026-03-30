import apiClient from './client';

export const authApi = {
  // POST /api/auth/login
  login: (identifier, password) =>
    apiClient.post('/auth/login', { identifier, password }),

  // POST /api/auth/logout
  logout: () =>
    apiClient.post('/auth/logout'),

  // POST /api/auth/resend-verification
  resendVerification: (email) =>
    apiClient.post('/auth/resend-verification', { email }),

  // POST /api/auth/forgot-password
  forgotPassword: (identifier) =>
    apiClient.post('/auth/forgot-password', { identifier }),

  // GET /api/auth/reset-password?token=<uuid>
  verifyResetToken: (token) =>
    apiClient.get('/auth/reset-password', { params: { token } }),

  // POST /api/auth/reset-password
  resetPassword: (token, password, confirmPassword) =>
    apiClient.post('/auth/reset-password', { token, password, confirmPassword }),

  // POST /api/auth/change-password
  changePassword: (currentPassword, newPassword, confirmPassword) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),
};
