import apiClient from './client';

export const notificationsApi = {
  // Registers the push token for the authenticated user
  registerToken: (fcm_token) =>
    apiClient.post('/notifications/tokens', { fcm_token }),

  // Retrieves paginated notification history
  getNotifications: (page = 1, perPage = 20) =>
    apiClient.get('/notifications', { params: { page, per_page: perPage } }),

  // Marks all notifications as read
  markAllAsRead: () =>
    apiClient.put('/notifications/read-all'),

  // Marks a single notification as read
  markAsRead: (id) =>
    apiClient.put(`/notifications/${id}/read`),

  // Logically deletes a single notification
  deleteNotification: (id) =>
    apiClient.delete(`/notifications/${id}`),
};

