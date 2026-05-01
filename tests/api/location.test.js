import apiClient from '../../src/api/client';
import { updateLocation, getFriendsLocations, updateLabel, deleteLabel } from '../../src/api/location';

jest.mock('../../src/api/client', () => ({
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('locationApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateLocation', () => {
    it('calls post /locations with coordinates', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { id: 1 } });
      const coords = { latitude: -34.123, longitude: -58.123 };
      
      const result = await updateLocation(coords);
      
      expect(apiClient.post).toHaveBeenCalledWith('/locations', coords);
      expect(result).toEqual({ id: 1 });
    });

    it('includes locationUpdateFrequency if provided', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { id: 1 } });
      const coords = { latitude: -34.123, longitude: -58.123, locationUpdateFrequency: 15 };
      
      await updateLocation(coords);
      
      expect(apiClient.post).toHaveBeenCalledWith('/locations', {
        latitude: -34.123,
        longitude: -58.123,
        locationUpdateFrequency: 15
      });
    });
  });

  describe('getFriendsLocations', () => {
    it('calls post /locations/friends with coordinates', async () => {
      const mockData = [{ friend_id: 1, distance: 0.5 }];
      apiClient.post.mockResolvedValueOnce({ data: mockData });
      const coords = { latitude: -34.123, longitude: -58.123 };
      
      const result = await getFriendsLocations(coords);
      
      expect(apiClient.post).toHaveBeenCalledWith('/locations/friends', coords);
      expect(result).toEqual(mockData);
    });
  });

  describe('updateLabel', () => {
    it('calls put /locations/label with label', async () => {
      apiClient.put.mockResolvedValueOnce({ data: { success: true } });
      const label = 'Home';
      
      const result = await updateLabel(label);
      
      expect(apiClient.put).toHaveBeenCalledWith('/locations/label', { label });
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteLabel', () => {
    it('calls delete /locations/label', async () => {
      apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
      
      const result = await deleteLabel();
      
      expect(apiClient.delete).toHaveBeenCalledWith('/locations/label');
      expect(result).toEqual({ success: true });
    });
  });
});
