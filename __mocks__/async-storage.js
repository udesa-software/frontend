// Mock for @react-native-async-storage/async-storage
const store = {};

const AsyncStorage = {
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(store[key] !== undefined ? store[key] : null);
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    return Promise.resolve();
  }),
  _reset: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  },
  _store: store,
};

export default AsyncStorage;
