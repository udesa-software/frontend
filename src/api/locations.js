import apiClient from './client';

export const locationsApi = {
  // GET /api/locations/privacy
  getPrivacyStatus: () =>
    apiClient.get('/locations/privacy'),

  // PATCH /api/locations/privacy
  setPrivacyStatus: (isPrivate) =>
    apiClient.patch('/locations/privacy', { isPrivate }),

  // POST /api/locations/radar — H6: radar de usuarios cercanos no-amigos
  getRadar: (latitude, longitude) =>
    apiClient.post('/locations/radar', { latitude, longitude }),

  // POST /api/locations/friends — H2: ubicaciones de amigos con distancia
  getFriendsLocations: (latitude, longitude) =>
    apiClient.post('/locations/friends', { latitude, longitude }),
};
