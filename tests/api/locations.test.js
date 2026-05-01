import apiClient from '../../src/api/client';
import { locationsApi } from '../../src/api/locations';

jest.mock('../../src/api/client', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
}));

describe('locationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getPrivacyStatus calls the correct endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { isPrivate: true } });
    
    const result = await locationsApi.getPrivacyStatus();
    
    expect(apiClient.get).toHaveBeenCalledWith('/locations/privacy');
    expect(result.data.isPrivate).toBe(true);
  });

  it('setPrivacyStatus calls the correct endpoint with correct data', async () => {
    apiClient.patch.mockResolvedValueOnce({ data: { isPrivate: true } });
    
    const result = await locationsApi.setPrivacyStatus(true);
    
    expect(apiClient.patch).toHaveBeenCalledWith('/locations/privacy', { isPrivate: true });
    expect(result.data.isPrivate).toBe(true);
  });

  it('getRadar posts coordinates to the correct endpoint', async () => {
    const mockUsers = [
      { userId: 'u1', username: 'alice', distance: '1.2 km', distanceMeters: 1200 },
    ];
    apiClient.post.mockResolvedValueOnce({ data: { users: mockUsers } });

    const result = await locationsApi.getRadar(-34.6, -58.4);

    expect(apiClient.post).toHaveBeenCalledWith('/locations/radar', {
      latitude: -34.6,
      longitude: -58.4,
    });
    expect(result.data.users).toHaveLength(1);
    expect(result.data.users[0].username).toBe('alice');
  });

  it('getRadar with false as isPrivate calls setPrivacyStatus correctly', async () => {
    apiClient.patch.mockResolvedValueOnce({ data: { isPrivate: false } });
    const result = await locationsApi.setPrivacyStatus(false);
    expect(apiClient.patch).toHaveBeenCalledWith('/locations/privacy', { isPrivate: false });
    expect(result.data.isPrivate).toBe(false);
  });
});

