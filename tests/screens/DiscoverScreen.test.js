import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { DiscoverScreen } from '../../src/screens/DiscoverScreen';
import { aiApi } from '../../src/api/ai';
import { friendsApi } from '../../src/api/friends';

const mockNavigate = jest.fn();

const mockUser = {
  id: 'current-user-id',
  username: 'mateo',
  biography: 'Estudiante de Computación. Me apasiona TypeScript, Python y el desarrollo de apps.',
};

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

jest.mock('../../src/api/ai', () => ({
  aiApi: {
    getRecommendations: jest.fn(),
  },
}));

jest.mock('../../src/api/friends', () => ({
  friendsApi: {
    sendRequest: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
    useFocusEffect: (cb) => {
      const { useEffect } = require('react');
      useEffect(() => {
        return cb();
      }, [cb]);
    },
  };
});

describe('DiscoverScreen (BioMatch)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning screen if the user has no biography', async () => {
    // Sobrescribir temporalmente el mock del user para simular biografía vacía
    const authMock = require('../../src/context/AuthContext');
    jest.spyOn(authMock, 'useAuth').mockReturnValue({
      user: { ...mockUser, biography: '' },
    });

    const { getByText } = render(<DiscoverScreen />);

    expect(getByText('¡Completa tu biografía!')).toBeTruthy();
    expect(getByText('Ir a Mi Perfil 👤')).toBeTruthy();

    const profileButton = getByText('Ir a Mi Perfil 👤');
    fireEvent.press(profileButton);
    expect(mockNavigate).toHaveBeenCalledWith('Perfil');

    // Restaurar el mock original
    authMock.useAuth.mockRestore();
  });

  it('fetches and renders recommendations deck successfully', async () => {
    const mockRecommendations = [
      { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
      { id: 'rec-2', username: 'sofia_martinez', biography: 'Biografía de Sofia' },
    ];
    aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);

    const { getByText, queryByText } = render(<DiscoverScreen />);

    expect(getByText('Buscando mentes afines...')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('@tomi.sanz')).toBeTruthy();
      expect(getByText('"Biografía de Tomi"')).toBeTruthy();
    });

    expect(queryByText('Buscando mentes afines...')).toBeNull();
  });

  it('handles empty recommendations list gracefully', async () => {
    aiApi.getRecommendations.mockResolvedValueOnce([]);

    const { getByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByText('¡Eso es todo por ahora!')).toBeTruthy();
      expect(getByText('Hemos analizado todas las biografías de la facultad. Vuelve más tarde para descubrir nuevas mentes brillantes afines a ti.')).toBeTruthy();
    });
  });

  it('handles API failure by showing an alert error message', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {});
    aiApi.getRecommendations.mockRejectedValueOnce(new Error('Internal server error'));

    render(<DiscoverScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudieron obtener recomendaciones por biografía.');
    });

    alertSpy.mockRestore();
  });

  it('sets biography warning if getRecommendations throws MISSING_BIOGRAPHY error code', async () => {
    const errorObj = { code: 'MISSING_BIOGRAPHY', message: 'No bio' };
    aiApi.getRecommendations.mockRejectedValueOnce(errorObj);

    const { getByText } = render(<DiscoverScreen />);

    await waitFor(() => {
      expect(getByText('¡Completa tu biografía!')).toBeTruthy();
    });
  });

  describe('Swipe gestures and extra interactions', () => {
    let panResponderSpy;

    beforeAll(() => {
      panResponderSpy = jest.spyOn(require('react-native').PanResponder, 'create').mockImplementation((config) => {
        return {
          panHandlers: {
            onResponderMove: (evt) => config.onPanResponderMove({}, evt.nativeEvent || evt),
            onResponderRelease: (evt) => config.onPanResponderRelease({}, evt.nativeEvent || evt),
          },
        };
      });
    });

    afterAll(() => {
      panResponderSpy.mockRestore();
    });

    it('handles swipe right (conectar) successfully', async () => {
      const mockRecommendations = [
        { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
        { id: 'rec-2', username: 'sofia_martinez', biography: 'Biografía de Sofia' },
      ];
      aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);
      friendsApi.sendRequest.mockResolvedValueOnce({});

      const { getByTestId, getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('@tomi.sanz')).toBeTruthy();
      });

      const card = getByTestId('recommendation-card');

      // Drag card to the right beyond threshold
      fireEvent(card, 'responderMove', { dx: 500, dy: 0 });
      await act(async () => {
        fireEvent(card, 'responderRelease', { dx: 500, dy: 0 });
      });

      await waitFor(() => {
        expect(friendsApi.sendRequest).toHaveBeenCalledWith('rec-1');
      });
      
      // Should show the next card (Sofia)
      await waitFor(() => {
        expect(getByText('@sofia_martinez')).toBeTruthy();
      });
    });

    it('handles swipe right failing silently when sendRequest rejects', async () => {
      const mockRecommendations = [
        { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
      ];
      aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);
      friendsApi.sendRequest.mockRejectedValueOnce(new Error('Network Error'));

      const { getByTestId, getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('@tomi.sanz')).toBeTruthy();
      });

      const card = getByTestId('recommendation-card');

      fireEvent(card, 'responderMove', { dx: 500, dy: 0 });
      await act(async () => {
        fireEvent(card, 'responderRelease', { dx: 500, dy: 0 });
      });

      await waitFor(() => {
        expect(friendsApi.sendRequest).toHaveBeenCalledWith('rec-1');
      });
      
      // Should advance to empty state since there was only 1 card
      await waitFor(() => {
        expect(getByText('¡Eso es todo por ahora!')).toBeTruthy();
      });
    });

    it('handles swipe left (pasar) successfully', async () => {
      const mockRecommendations = [
        { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
      ];
      aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);

      const { getByTestId, getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('@tomi.sanz')).toBeTruthy();
      });

      const card = getByTestId('recommendation-card');

      // Swipe left
      fireEvent(card, 'responderMove', { dx: -500, dy: 0 });
      await act(async () => {
        fireEvent(card, 'responderRelease', { dx: -500, dy: 0 });
      });

      expect(friendsApi.sendRequest).not.toHaveBeenCalled();
      
      // Should advance to empty state
      await waitFor(() => {
        expect(getByText('¡Eso es todo por ahora!')).toBeTruthy();
      });
    });

    it('resets position on small drag', async () => {
      const mockRecommendations = [
        { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
      ];
      aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);

      const { getByTestId, getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('@tomi.sanz')).toBeTruthy();
      });

      const card = getByTestId('recommendation-card');

      // Small drag, below threshold
      fireEvent(card, 'responderMove', { dx: 10, dy: 0 });
      await act(async () => {
        fireEvent(card, 'responderRelease', { dx: 10, dy: 0 });
      });

      // Should still be on Tomi
      expect(getByText('@tomi.sanz')).toBeTruthy();
      expect(friendsApi.sendRequest).not.toHaveBeenCalled();
    });

    it('reloads feed when actualize feed button is pressed', async () => {
      aiApi.getRecommendations.mockResolvedValueOnce([]); // empty initially
      
      const { getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('Actualizar Feed')).toBeTruthy();
      });

      // Mock next load returning a recommendation
      const mockRecommendations = [
        { id: 'rec-1', username: 'tomi.sanz', biography: 'Biografía de Tomi' },
      ];
      aiApi.getRecommendations.mockResolvedValueOnce(mockRecommendations);

      await act(async () => {
        fireEvent.press(getByText('Actualizar Feed'));
      });

      await waitFor(() => {
        expect(getByText('@tomi.sanz')).toBeTruthy();
      });
    });

    it('treats whitespace biography as no biography', async () => {
      const authMock = require('../../src/context/AuthContext');
      jest.spyOn(authMock, 'useAuth').mockReturnValue({
        user: { ...mockUser, biography: '    ' }, // whitespace
      });

      const { getByText } = render(<DiscoverScreen />);

      await waitFor(() => {
        expect(getByText('¡Completa tu biografía!')).toBeTruthy();
      });

      authMock.useAuth.mockRestore();
    });
  });
});
