import '@testing-library/jest-native/extend-expect';

// Mock global de Alert de React Native
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Alert.alert = jest.fn();
  return RN;
});

// Silencia console.error/warn
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Mock global de react-navigation para evitar errores de useRoute
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: jest.fn().mockReturnValue({
      params: {},
    }),
    useNavigation: jest.fn().mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});
