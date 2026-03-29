import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes, radii } from '../theme';

export function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Hola, {user.username}!</Text>
      <Text style={styles.subtitle}>{user.email}</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardInfo}>Tu ID es: {user.id || 'N/A'}</Text>
        <Text style={styles.cardInfo}>Tu rol es: {user.role || 'Usuario'}</Text>
      </View>

      <AppButton
        title="Cerrar Sesión"
        variant="secondary"
        onPress={logout}
        style={styles.logoutBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSizes.xxxl,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    color: colors.text,
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
  },
  logoutBtn: {
    marginTop: spacing.xl,
  },
});
