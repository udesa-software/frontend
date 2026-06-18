import { aiApi } from '../../src/api/ai';
import apiClient from '../../src/api/client';

jest.mock('../../src/api/client', () => ({
  get: jest.fn(),
}));

describe('aiApi', () => {
  const originalEnv = process.env.EXPO_PUBLIC_USE_MOCK;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_USE_MOCK = originalEnv;
  });

  it('throws MISSING_BIOGRAPHY error when mock mode is active and currentUser has no biography', async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = 'true';
    const userWithoutBio = { id: 'u1', username: 'user1', biography: '' };
    
    await expect(aiApi.getRecommendations(userWithoutBio)).rejects.toThrow(
      'El usuario actual no tiene biografía registrada.'
    );
  });

  it('returns filtered MOCK_RECOMMENDATIONS when mock mode is active', async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = 'true';
    const currentUser = { id: 'u1', username: 'user1', biography: 'Hago running y me gusta la tecnología.' };

    const recommendations = await aiApi.getRecommendations(currentUser);
    expect(recommendations.length).toBeGreaterThan(0);
    // Debe filtrar al propio usuario
    const selfInRecs = recommendations.find(r => r.id === currentUser.id || r.username === currentUser.username);
    expect(selfInRecs).toBeUndefined();
  });

  it('performs HTTP call using apiClient when mock mode is disabled', async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = 'false';
    const mockResponse = { data: [{ id: 'rec-1', username: 'ai_friend', biography: 'AI generated bio' }] };
    apiClient.get.mockResolvedValueOnce(mockResponse);

    const currentUser = { id: 'u1', username: 'user1', biography: 'Hago running y me gusta la tecnología.' };
    const recommendations = await aiApi.getRecommendations(currentUser);

    expect(apiClient.get).toHaveBeenCalledWith('/ai/recommendations');
    expect(recommendations).toEqual(mockResponse.data);
  });

  it('propagates api error payload correctly when mock mode is disabled', async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = 'false';
    const errorResponse = {
      response: {
        data: {
          code: 'MISSING_BIOGRAPHY',
          error: 'User biography is required for recommendations',
        },
      },
    };
    apiClient.get.mockRejectedValueOnce(errorResponse);

    const currentUser = { id: 'u1', username: 'user1', biography: 'some bio' };
    await expect(aiApi.getRecommendations(currentUser)).rejects.toEqual(errorResponse.response.data);
  });

  it('propagates generic error when mock mode is disabled and no response data exists', async () => {
    process.env.EXPO_PUBLIC_USE_MOCK = 'false';
    const genericError = new Error('Network timeout');
    apiClient.get.mockRejectedValueOnce(genericError);

    const currentUser = { id: 'u1', username: 'user1', biography: 'some bio' };
    await expect(aiApi.getRecommendations(currentUser)).rejects.toThrow('Network timeout');
  });
});
