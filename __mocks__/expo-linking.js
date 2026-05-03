const createURL = jest.fn((path) => `exp://localhost/${path}`);
const openURL = jest.fn(() => Promise.resolve());
const getInitialURL = jest.fn(() => Promise.resolve(null));
const addEventListener = jest.fn(() => ({ remove: jest.fn() }));

module.exports = {
  createURL,
  openURL,
  getInitialURL,
  addEventListener,
};
