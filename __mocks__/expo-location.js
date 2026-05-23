const requestForegroundPermissionsAsync = jest.fn(() => Promise.resolve({ status: 'granted' }));
const getCurrentPositionAsync = jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } }));
const Accuracy = { Balanced: 3, High: 5, Low: 1 };

module.exports = {
  requestForegroundPermissionsAsync,
  getCurrentPositionAsync,
  Accuracy,
};
