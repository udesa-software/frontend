import apiClient from './client';

export const notificationsApi = {
  // Registers the push token for the authenticated user
  registerToken: (fcm_token) =>
    apiClient.post('/notifications/tokens', { fcm_token }),
};
