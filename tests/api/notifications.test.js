import { notificationsApi } from '../../src/api/notifications';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('notificationsApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registerToken calls post /notifications/tokens', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { status: 'ok' } });
    const res = await notificationsApi.registerToken('my-token');
    expect(apiClient.post).toHaveBeenCalledWith('/notifications/tokens', { fcm_token: 'my-token' });
    expect(res.data.status).toBe('ok');
  });

  it('getNotifications calls get /notifications with default params', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { notifications: [], pages: 1 } });
    await notificationsApi.getNotifications();
    expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, per_page: 20 } });
  });

  it('getNotifications passes custom page and perPage', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { notifications: [], pages: 3 } });
    await notificationsApi.getNotifications(2, 10);
    expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: { page: 2, per_page: 10 } });
  });

  it('markAllAsRead calls put /notifications/read-all', async () => {
    apiClient.put.mockResolvedValueOnce({ data: { status: 'ok' } });
    await notificationsApi.markAllAsRead();
    expect(apiClient.put).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('markAsRead calls put /notifications/:id/read', async () => {
    apiClient.put.mockResolvedValueOnce({ data: { status: 'ok' } });
    await notificationsApi.markAsRead(42);
    expect(apiClient.put).toHaveBeenCalledWith('/notifications/42/read');
  });

  it('deleteNotification calls delete /notifications/:id', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { status: 'ok' } });
    await notificationsApi.deleteNotification(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/notifications/7');
  });
});
