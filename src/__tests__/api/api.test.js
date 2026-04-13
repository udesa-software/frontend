// Tests for the API layer (auth.js and users.js)
// We mock the apiClient directly so no real HTTP calls are made.

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  })),
}));

import axios from 'axios';
// axios is mocked globally for this file via the jest.mock('axios'...) at top



jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));


import apiClient from '../../api/client';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import * as SecureStore from 'expo-secure-store';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// authApi
// ─────────────────────────────────────────────
describe('authApi', () => {
  describe('login', () => {
    it('calls POST /auth/login with identifier and password', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      authApi.login('user@test.com', 'pass123');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        identifier: 'user@test.com',
        password: 'pass123',
      });
    });
  });

  describe('logout', () => {
    it('reads refreshToken from SecureStore and calls POST /auth/logout', async () => {
      SecureStore.getItemAsync.mockResolvedValueOnce('my-refresh-token');
      apiClient.post.mockResolvedValueOnce({ data: {} });

      await authApi.logout();

      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('refreshToken');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', {
        refreshToken: 'my-refresh-token',
      });
    });

    it('passes null refreshToken when SecureStore has no token', async () => {
      SecureStore.getItemAsync.mockResolvedValueOnce(null);
      apiClient.post.mockResolvedValueOnce({ data: {} });

      await authApi.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout', { refreshToken: null });
    });
  });

  describe('refresh', () => {
    it('reads refreshToken and calls POST /auth/refresh', async () => {
      SecureStore.getItemAsync.mockResolvedValueOnce('rt-token');
      apiClient.post.mockResolvedValueOnce({ data: { accessToken: 'new-at' } });

      await authApi.refresh();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'rt-token',
      });
    });
  });

  describe('resendVerification', () => {
    it('calls POST /auth/resend-verification with email', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      authApi.resendVerification('user@test.com');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification', {
        email: 'user@test.com',
      });
    });
  });

  describe('forgotPassword', () => {
    it('calls POST /auth/forgot-password with identifier', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      authApi.forgotPassword('user@test.com');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', {
        identifier: 'user@test.com',
      });
    });
  });

  describe('verifyResetToken', () => {
    it('calls GET /auth/reset-password with token param', () => {
      apiClient.get.mockResolvedValueOnce({ data: {} });
      authApi.verifyResetToken('abc-token');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/reset-password', {
        params: { token: 'abc-token' },
      });
    });
  });

  describe('resetPassword', () => {
    it('calls POST /auth/reset-password with all required fields', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      authApi.resetPassword('tok', 'newPass1!', 'newPass1!');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'tok',
        password: 'newPass1!',
        confirmPassword: 'newPass1!',
      });
    });
  });

  describe('changePassword', () => {
    it('calls POST /auth/change-password with all required fields', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      authApi.changePassword('oldPass', 'newPass1!', 'newPass1!');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'oldPass',
        newPassword: 'newPass1!',
        confirmPassword: 'newPass1!',
      });
    });
  });

  describe('verifyEmail', () => {
    it('calls GET /auth/verify-email with token param', () => {
      apiClient.get.mockResolvedValueOnce({ data: {} });
      authApi.verifyEmail('email-verification-token');
      expect(apiClient.get).toHaveBeenCalledWith('/auth/verify-email', {
        params: { token: 'email-verification-token' },
      });
    });
  });
});

// ─────────────────────────────────────────────
// usersApi
// ─────────────────────────────────────────────
describe('usersApi', () => {
  describe('register', () => {
    it('calls POST /users/register with all fields', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      usersApi.register('johndoe', 'john@test.com', 'password123', true);
      expect(apiClient.post).toHaveBeenCalledWith('/users/register', {
        username: 'johndoe',
        email: 'john@test.com',
        password: 'password123',
        acceptedTerms: true,
      });
    });
  });

  describe('deleteAccount', () => {
    it('calls POST /users/delete with password', () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      usersApi.deleteAccount('mypassword');
      expect(apiClient.post).toHaveBeenCalledWith('/users/delete', {
        password: 'mypassword',
      });
    });
  });
});
