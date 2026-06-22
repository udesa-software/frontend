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

  it('uses default parameters in getPendingRequests and getFriendsList', async () => {
    apiClient.get.mockResolvedValue({ data: [] });
    
    // Call without page
    await friendsApi.getPendingRequests();
    expect(apiClient.get).toHaveBeenLastCalledWith('/friends/pending', { params: { page: 1 } });

    // Call without arguments
    await friendsApi.getFriendsList();
    expect(apiClient.get).toHaveBeenLastCalledWith('/friends', { params: { sortBy: 'alphabetical', page: 1 } });
  });

  it('cancelRequest calls post /friends/cancel', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.cancelRequest('user2');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/cancel', { addresseeId: 'user2' });
  });

  it('getRelationshipStatus calls get /friends/status/:userId', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { status: 'friends' } });
    const res = await friendsApi.getRelationshipStatus('user3');
    expect(apiClient.get).toHaveBeenCalledWith('/friends/status/user3');
    expect(res.data.status).toBe('friends');
  });

  it('getRelationshipStatuses calls post /friends/status/batch', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { 'u1': 'friends', 'u2': 'none' } });
    const res = await friendsApi.getRelationshipStatuses(['u1', 'u2']);
    expect(apiClient.post).toHaveBeenCalledWith('/friends/status/batch', { userIds: ['u1', 'u2'] });
    expect(res.data['u1']).toBe('friends');
  });

  it('blockUser calls post /friends/block', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.blockUser('baduser', 'baduser_name');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/block', { blockedId: 'baduser', blockedUsername: 'baduser_name' });
  });

  it('unblockUser calls delete /friends/block/:blockedId', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
    await friendsApi.unblockUser('baduser');
    expect(apiClient.delete).toHaveBeenCalledWith('/friends/block/baduser');
  });

  it('reportUser calls post /friends/reports', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { message: 'Denuncia enviada' } });
    const res = await friendsApi.reportUser('baduser', 'baduser_name', 'harassment');
    expect(apiClient.post).toHaveBeenCalledWith('/friends/reports', {
      reportedId: 'baduser',
      reportedUsername: 'baduser_name',
      reason: 'harassment',
    });
    expect(res.data.message).toBe('Denuncia enviada');
  });
});
