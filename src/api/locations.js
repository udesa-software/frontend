import apiClient from './client';

export const locationsApi = {
  // GET /api/locations/privacy
  getPrivacyStatus: () =>
    apiClient.get('/locations/privacy'),

  // PATCH /api/locations/privacy
  setPrivacyStatus: (isPrivate) =>
    apiClient.patch('/locations/privacy', { isPrivate }),
};
