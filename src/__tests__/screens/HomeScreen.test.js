import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'mateo', email: 'mateo@test.com' }
  }),
}));

import { HomeScreen } from '../../screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders welcome message with username', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('¡Hola, mateo!')).toBeTruthy();
    expect(getByText('mateo@test.com')).toBeTruthy();
    expect(getByText('Bienvenido a UdeSA-migos.')).toBeTruthy();
  });
});
