import { friendsApi } from '../../src/api/friends';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
}));

describe('friendsApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sendRequest calls post /friends/request', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await friendsApi.sendRequest('user1');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/request', { addresseeId: 'user1' });
    expect(res.data.success).toBe(true);
  });

  it('removeFriend calls delete /friends/:friendId', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.removeFriend('friend1');
    expect(apiClient.delete).toHaveBeenCalledWith('/friends/friend1');
  });

  it('acceptRequest calls post /friends/accept', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.acceptRequest('req1');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/accept', { requesterId: 'req1' });
  });

  it('declineRequest calls post /friends/decline', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.declineRequest('req1');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/decline', { requesterId: 'req1' });
  });

  it('getPendingRequests calls get /friends/pending', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    await friendsApi.getPendingRequests(2);
    expect(apiClient.get).toHaveBeenCalledWith('/friends/pending', { params: { page: 2 } });
  });

  it('getFriendsList calls get /friends', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    await friendsApi.getFriendsList('proximity', 3);
    expect(apiClient.get).toHaveBeenCalledWith('/friends', { params: { sortBy: 'proximity', page: 3 } });
  });
});
