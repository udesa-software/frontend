import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkColors = {
  primary: '#6C63FF',       // Violeta principal
  primaryDark: '#4B44CC',
  primaryLight: '#EAE9FF',
  background: '#0F0E17',    // Fondo oscuro
  surface: '#1A1A2E',       // Cards / inputs
  surfaceAlt: '#22223B',
  text: '#FFFFFE',
  textMuted: '#A7A9BE',
  error: '#FF6B6B',
  success: '#6BCB77',
  border: '#2E2E48',
};

export const lightColors = {
  primary: '#6C63FF',       // Violeta principal
  primaryDark: '#4B44CC',
  primaryLight: '#EAE9FF',
  background: '#F8F9FA',    // Fondo claro
  surface: '#FFFFFF',       // Cards / inputs
  surfaceAlt: '#F1F3F5',
  text: '#212529',
  textMuted: '#6C757D',
  error: '#FF6B6B',
  success: '#6BCB77',
  border: '#DEE2E6',
};

// Fallback for components not yet migrated
export const colors = darkColors;

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_preference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (err) {
        console.error('Error loading theme preference', err);
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newValue = !isDarkMode;
      setIsDarkMode(newValue);
      await AsyncStorage.setItem('@theme_preference', newValue ? 'dark' : 'light');
    } catch (err) {
      console.error('Error saving theme preference', err);
    }
  };

  const themeColors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors: themeColors, isThemeLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Default fallback para que los tests pasen si el componente no está envuelto en <ThemeProvider>
    return { isDarkMode: true, toggleTheme: () => {}, colors: darkColors, isThemeLoaded: true };
  }
  return context;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
};
