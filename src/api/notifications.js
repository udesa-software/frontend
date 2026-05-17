import apiClient from './client';

export const notificationsApi = {
  /**
   * Registra el token de FCM para el usuario actual.
   * @param {string} userId 
   * @param {string} fcmToken 
   */
  registerToken: (userId, fcmToken) => {
    return apiClient.post('/notifications/tokens', {
      user_id: userId,
      fcm_token: fcmToken,
    });
  },
};
