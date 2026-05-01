import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { colors, fontSizes } from '../theme';

export function CoordsCard({ lastSent }) {
  if (!lastSent) return null;
  return (
    <View style={styles.syncInfoCard}>
      <Text style={styles.coordsLastSent}>
        Actualizado: {lastSent.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

export function StatusView({ loading, emoji, title, message, action }) {
  return (
    <View style={styles.statusContainer}>
      {loading && <ActivityIndicator size="large" color={colors.primary} />}
      {!loading && emoji ? <Text style={styles.statusEmoji}>{emoji}</Text> : null}
      {title ? <Text style={styles.statusTitle}>{title}</Text> : null}
      {message ? <Text style={styles.statusMessage}>{message}</Text> : null}
      {action && (
        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={action.onPress}
        >
          <Text style={styles.actionText}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function SyncBadge({ status }) {
  const config = {
    syncing:  { color: '#F59E0B', text: '⟳' },
    synced:   { color: '#10B981', text: '●' },
    error:    { color: '#EF4444', text: '!' },
    idle:     { color: colors.textMuted, text: '○' },
  };
  const { color, text } = config[status] ?? config.idle;

  return (
    <View style={[styles.miniBadge, { backgroundColor: color + '20', borderColor: color }]}>
       <Text style={[styles.miniBadgeText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  syncInfoCard: { marginTop: 2 },
  coordsLastSent: { fontSize: fontSizes.xs, color: colors.textMuted },
  
  miniBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  miniBadgeText: { fontSize: 10, fontWeight: '900' },
  
  statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  statusEmoji: { fontSize: 48, marginBottom: 20 },
  statusTitle: { fontSize: fontSizes.xl, fontWeight: '700', color: '#FFFFFE' },
  statusMessage: { fontSize: fontSizes.md, color: colors.textMuted, textAlign: 'center', marginTop: 10 },
  actionButton: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 20 },
  actionText: { color: '#FFFFFE', fontWeight: '600' },
});
