import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, darkColors, lightColors } from '../index';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Componente de prueba para consumir el contexto
const TestComponent = () => {
  const { colors, isDarkMode, toggleTheme, isThemeLoaded } = useTheme();

  if (!isThemeLoaded) {
    return <Text testID="loading">Loading...</Text>;
  }

  return (
    <>
      <Text testID="theme-status">{isDarkMode ? 'dark' : 'light'}</Text>
      <Text testID="primary-color">{colors.primary}</Text>
      <Text testID="background-color">{colors.background}</Text>
      <TouchableOpacity testID="toggle-button" onPress={toggleTheme}>
        Toggle
      </TouchableOpacity>
    </>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería inicializar con dark mode por defecto si no hay preferencia guardada', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Esperar a que el tema cargue
    await waitFor(() => {
      expect(getByTestId('theme-status').props.children).toBe('dark');
    });

    expect(getByTestId('background-color').props.children).toBe(darkColors.background);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@theme_preference');
  });

  it('debería inicializar con light mode si está guardado en AsyncStorage', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('light');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Esperar a que el tema cargue
    await waitFor(() => {
      expect(getByTestId('theme-status').props.children).toBe('light');
    });

    expect(getByTestId('background-color').props.children).toBe(lightColors.background);
  });

  it('debería alternar el tema y guardar la preferencia al tocar el botón (dark a light)', async () => {
    AsyncStorage.getItem.mockResolvedValueOnce('dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('theme-status').props.children).toBe('dark');
    });

    // Simular presionar el botón de toggle
    const toggleButton = getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    // Verificar que cambió a light
    await waitFor(() => {
      expect(getByTestId('theme-status').props.children).toBe('light');
    });

    expect(getByTestId('background-color').props.children).toBe(lightColors.background);
    
    // Verificar que se guardó en AsyncStorage (CA.1)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@theme_preference', 'light');
  });
});
