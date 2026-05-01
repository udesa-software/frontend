import apiClient from '../../src/api/client';
import { 
  updateLocation, 
  getFriendsLocations, 
  updateLabel, 
  deleteLabel,
  getPrivacyStatus,
  setPrivacyStatus,
  getRadar
} from '../../src/api/location';

jest.mock('../../src/api/client', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('location API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateLocation', () => {
    it('sends coordinates correctly', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { success: true } });
      const coords = { latitude: 10, longitude: 20 };
      const result = await updateLocation(coords);
      expect(apiClient.post).toHaveBeenCalledWith('/locations', coords);
      expect(result.success).toBe(true);
    });

    it('sends frequency if provided', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { success: true } });
      const coords = { latitude: 10, longitude: 20, locationUpdateFrequency: 15 };
      await updateLocation(coords);
      expect(apiClient.post).toHaveBeenCalledWith('/locations', coords);
    });
  });

  describe('getFriendsLocations', () => {
    it('sends coordinates as object', async () => {
      const mockData = { friends: [{ userId: '1', distance: '1km' }] };
      apiClient.post.mockResolvedValueOnce({ data: mockData });
      const coords = { latitude: 10, longitude: 20 };
      const result = await getFriendsLocations(coords);
      expect(apiClient.post).toHaveBeenCalledWith('/locations/friends', coords);
      expect(result.friends).toHaveLength(1);
    });
  });

  describe('updateLabel', () => {
    it('sends correct data', async () => {
      apiClient.put.mockResolvedValueOnce({ data: { success: true } });
      const result = await updateLabel('at work');
      expect(apiClient.put).toHaveBeenCalledWith('/locations/label', { label: 'at work' });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteLabel', () => {
    it('calls correct endpoint', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
      const result = await deleteLabel();
      expect(apiClient.delete).toHaveBeenCalledWith('/locations/label');
      expect(result.success).toBe(true);
    });
  });

  describe('privacy', () => {
    it('getPrivacyStatus calls correct endpoint', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { isPrivate: true } });
      const result = await getPrivacyStatus();
      expect(apiClient.get).toHaveBeenCalledWith('/locations/privacy');
      expect(result.isPrivate).toBe(true);
    });

    it('setPrivacyStatus calls correct endpoint', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { isPrivate: false } });
      const result = await setPrivacyStatus(false);
      expect(apiClient.patch).toHaveBeenCalledWith('/locations/privacy', { isPrivate: false });
      expect(result.isPrivate).toBe(false);
    });
  });

  describe('getRadar', () => {
    it('sends coordinates as object', async () => {
      const mockData = { users: [{ userId: 'u1', distance: '500m' }] };
      apiClient.post.mockResolvedValueOnce({ data: mockData });
      const result = await getRadar({ latitude: -34.6, longitude: -58.4 });
      expect(apiClient.post).toHaveBeenCalledWith('/locations/radar', { latitude: -34.6, longitude: -58.4 });
      expect(result.users).toHaveLength(1);
    });
  });
});
