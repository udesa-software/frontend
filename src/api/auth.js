import * as SecureStore from 'expo-secure-store';
import apiClient from './client';

export const authApi = {
  // POST /api/auth/login
  login: (identifier, password) =>
    apiClient.post('/auth/login', { identifier, password }),

  // POST /api/auth/logout
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return apiClient.post('/auth/logout', { refreshToken });
  },

  // POST /api/auth/refresh
  refresh: async () => {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return apiClient.post('/auth/refresh', { refreshToken });
  },

  // POST /api/auth/resend-verification
  resendVerification: (identifier) =>
    apiClient.post('/auth/resend-verification', { identifier }),

  // GET /api/auth/verify-email?token=<uuid>
  verifyEmail: (token) =>
    apiClient.get('/auth/verify-email', { params: { token } }),

  // POST /api/auth/forgot-password
  forgotPassword: (identifier, returnUrl) =>
    apiClient.post('/auth/forgot-password', { identifier, returnUrl }),

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
