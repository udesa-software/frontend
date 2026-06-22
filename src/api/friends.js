import apiClient from './client';

export const friendsApi = {
  // POST /api/friends/request
  sendRequest: (addresseeId) =>
    apiClient.post('/friends/request', { addresseeId }),

  // DELETE /api/friends/:friendId
  removeFriend: (friendId) =>
    apiClient.delete(`/friends/${friendId}`),

  // POST /api/friends/cancel
  cancelRequest: (addresseeId) =>
    apiClient.post('/friends/cancel', { addresseeId }),

  // POST /api/friends/accept
  acceptRequest: (requesterId) =>
    apiClient.post('/friends/accept', { requesterId }),

  // POST /api/friends/decline
  declineRequest: (requesterId) =>
    apiClient.post('/friends/decline', { requesterId }),

  // GET /api/friends/pending
  getPendingRequests: (page = 1) =>
    apiClient.get('/friends/pending', { params: { page } }),

  // GET /api/friends
  getFriendsList: (sortBy = 'alphabetical', page = 1) =>
    apiClient.get('/friends', { params: { sortBy, page } }),

  // GET /api/friends/status/:userId — estado de relación con otro usuario
  getRelationshipStatus: (userId) =>
    apiClient.get(`/friends/status/${userId}`),

  // POST /api/friends/status/batch
  getRelationshipStatuses: (userIds) =>
    apiClient.post('/friends/status/batch', { userIds }),

  // POST /api/friends/block
  blockUser: (blockedId, blockedUsername) =>
    apiClient.post('/friends/block', { blockedId, blockedUsername }),

  // DELETE /api/friends/block/:blockedId
  unblockUser: (blockedId) =>
    apiClient.delete(`/friends/block/${blockedId}`),

  // POST /api/friends/reports — H9: denunciar usuario
  reportUser: (reportedId, reportedUsername, reason) =>
    apiClient.post('/friends/reports', { reportedId, reportedUsername, reason }),
};
