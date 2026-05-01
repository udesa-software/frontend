import apiClient from '../../src/api/client';
import { locationsApi } from '../../src/api/locations';

jest.mock('../../src/api/client', () => ({
  get: jest.fn(),
  patch: jest.fn(),
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
});
