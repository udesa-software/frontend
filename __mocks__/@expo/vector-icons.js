// Mock for @expo/vector-icons — all icon families return a simple Text component
const React = require('react');
const { Text } = require('react-native');

const createIconMock = (family) => {
  const Icon = ({ name, size, color, style, testID, ...rest }) =>
    React.createElement(
      Text,
      { testID: testID || `icon-${family}-${name}`, style: [{ fontSize: size, color }, style], ...rest },
      name
    );
  Icon.displayName = family;
  return Icon;
};

module.exports = {
  Ionicons: createIconMock('Ionicons'),
  MaterialIcons: createIconMock('MaterialIcons'),
  MaterialCommunityIcons: createIconMock('MaterialCommunityIcons'),
  FontAwesome: createIconMock('FontAwesome'),
  FontAwesome5: createIconMock('FontAwesome5'),
  Feather: createIconMock('Feather'),
  AntDesign: createIconMock('AntDesign'),
  Entypo: createIconMock('Entypo'),
  EvilIcons: createIconMock('EvilIcons'),
  Octicons: createIconMock('Octicons'),
  SimpleLineIcons: createIconMock('SimpleLineIcons'),
  Zocial: createIconMock('Zocial'),
};
