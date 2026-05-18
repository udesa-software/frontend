import { notificationsApi } from '../../src/api/notifications';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
}));

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls apiClient.post with the correct token payload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { status: 'ok' } });
    const res = await notificationsApi.registerToken('my-token');
    expect(apiClient.post).toHaveBeenCalledWith('/notifications/tokens', { fcm_token: 'my-token' });
    expect(res).toEqual({ data: { status: 'ok' } });
  });
});
