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

  it('updateLocation sends correct data', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    const result = await updateLocation({ latitude: 10, longitude: 20 });
    expect(apiClient.post).toHaveBeenCalledWith('/locations', { latitude: 10, longitude: 20 });
    expect(result.success).toBe(true);
  });

  it('updateLocation sends frequency if provided', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { success: true } });
    await updateLocation({ latitude: 10, longitude: 20, locationUpdateFrequency: 15 });
    expect(apiClient.post).toHaveBeenCalledWith('/locations', { 
      latitude: 10, 
      longitude: 20, 
      locationUpdateFrequency: 15 
    });
  });

  it('getFriendsLocations sends coordinates as object', async () => {
    const mockData = { friends: [{ userId: '1', distance: '1km' }] };
    apiClient.post.mockResolvedValueOnce({ data: mockData });
    const result = await getFriendsLocations({ latitude: 10, longitude: 20 });
    expect(apiClient.post).toHaveBeenCalledWith('/locations/friends', { latitude: 10, longitude: 20 });
    expect(result.friends).toHaveLength(1);
  });

  it('updateLabel sends correct data', async () => {
    apiClient.put.mockResolvedValueOnce({ data: { success: true } });
    const result = await updateLabel('at work');
    expect(apiClient.put).toHaveBeenCalledWith('/locations/label', { label: 'at work' });
    expect(result.success).toBe(true);
  });

  it('deleteLabel calls correct endpoint', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { success: true } });
    const result = await deleteLabel();
    expect(apiClient.delete).toHaveBeenCalledWith('/locations/label');
    expect(result.success).toBe(true);
  });

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

  it('getRadar sends coordinates as object', async () => {
    const mockData = { users: [{ userId: 'u1', distance: '500m' }] };
    apiClient.post.mockResolvedValueOnce({ data: mockData });
    const result = await getRadar({ latitude: -34.6, longitude: -58.4 });
    expect(apiClient.post).toHaveBeenCalledWith('/locations/radar', { latitude: -34.6, longitude: -58.4 });
    expect(result.users).toHaveLength(1);
  });
});
