import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/index';

export function UserAvatar({ username = '', photoUrl = null, size = 40 }) {
  const { colors } = useTheme();

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + '33',
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4, color: colors.primary }]}>
        {(username || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
