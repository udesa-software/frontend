import apiClient from '../../src/api/client';
import {
  updateLocation,
  getFriendsLocations,
  updateLabel,
  deleteLabel,
  getPrivacyStatus,
  setPrivacyStatus,
  getRadar,
  updatePinColor,
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

  // H9: color del pin
  describe('updatePinColor', () => {
    it('llama al endpoint correcto con el color elegido (CA.1)', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { message: 'Color de pin actualizado', pinColor: '#4ECDC4' } });

      const result = await updatePinColor('#4ECDC4');

      expect(apiClient.patch).toHaveBeenCalledWith('/locations/pin-color', { pinColor: '#4ECDC4' });
      expect(result.pinColor).toBe('#4ECDC4');
    });

    it('retorna el mensaje del servidor', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { message: 'Color de pin actualizado', pinColor: '#FF6B6B' } });

      const result = await updatePinColor('#FF6B6B');

      expect(result.message).toBe('Color de pin actualizado');
    });
  });
});
