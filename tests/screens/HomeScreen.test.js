import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'mateo', email: 'mateo@test.com' }
  }),
}));

jest.mock('../../src/api/notifications', () => ({
  notificationsApi: {
    getNotifications: jest.fn().mockResolvedValue({
      data: {
        notifications: [
          { id: 1, title: 'Test Notif', body: 'Test body', is_read: false }
        ]
      }
    })
  }
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn()
    }),
    useFocusEffect: (cb) => cb(),
    useRoute: jest.fn().mockReturnValue({
      params: {},
    }),
  };
});

import { HomeScreen } from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders welcome message with username', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('¡Hola, mateo!')).toBeTruthy();
    expect(getByText('mateo@test.com')).toBeTruthy();
    expect(getByText('Bienvenido a UdeSA-migos.')).toBeTruthy();
  });
});
