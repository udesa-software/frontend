import apiClient from './client';

export const friendsApi = {
  // POST /api/friends/request
  sendRequest: (addresseeId) =>
    apiClient.post('/friends/request', { addresseeId }),

  // DELETE /api/friends/:friendId
  removeFriend: (friendId) =>
    apiClient.delete(`/friends/${friendId}`),

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

  // POST /api/friends/report — H9: denunciar usuario
  reportUser: (reportedId, reason) =>
    apiClient.post('/friends/report', { reportedId, reason }),
};
