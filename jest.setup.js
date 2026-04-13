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
