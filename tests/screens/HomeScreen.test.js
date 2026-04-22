import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { username: 'mateo', email: 'mateo@test.com' }
  }),
}));

import { HomeScreen } from '../../src/screens/HomeScreen';

describe('HomeScreen', () => {
  it('renders welcome message with username', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('¡Hola, mateo!')).toBeTruthy();
    expect(getByText('mateo@test.com')).toBeTruthy();
    expect(getByText('Bienvenido a UdeSA-migos.')).toBeTruthy();
  });
});
