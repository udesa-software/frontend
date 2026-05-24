import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getFriendProfile } from '../api/location';
import { colors, spacing, fontSizes, radii } from '../theme';

/**
 * Formatea una fecha pasada en texto relativo (ej. "hace 3 h").
 */
function formatTimeAgo(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  return `hace ${diffDays} d`;
}

/**
 * Pantalla de perfil detallado de un amigo.
 * Muestra biografía, presencia online y las últimas 10 ubicaciones/check-ins.
 *
 * Parámetros de navegación esperados:
 *   - friendId   {string}  UUID del amigo
 *   - username   {string}  Nombre del amigo (para el header mientras carga)
 */
export function FriendProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { friendId, username: initialUsername } = route.params ?? {};

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!friendId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFriendProfile(friendId);
      setProfile(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al cargar el perfil';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [friendId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const displayName = profile?.username || initialUsername || 'Amigo';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      {/* Header manual */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadProfile}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar + Presencia */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View
                testID="online-status-dot"
                style={[styles.onlineDot, profile.is_online ? styles.dotOnline : styles.dotOffline]}
              />
            </View>
            <Text style={styles.profileName}>{profile.username}</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDotSmall, profile.is_online ? styles.dotOnline : styles.dotOffline]} />
              <Text style={[styles.statusText, profile.is_online ? styles.statusOnline : styles.statusOffline]}>
                {profile.is_online
                  ? 'En línea'
                  : profile.last_seen_at
                  ? `Visto ${formatTimeAgo(profile.last_seen_at)}`
                  : 'Sin actividad'}
              </Text>
            </View>
          </View>

          {/* Biografía */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biografía</Text>
            <View style={styles.card}>
              <Text style={[styles.biographyText, !profile.biography && styles.emptyText]}>
                {profile.biography || 'Sin biografía'}
              </Text>
            </View>
          </View>

          {/* Historial de lugares */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de lugares</Text>

            {profile.isHistoryPrivate ? (
              <View style={styles.privateCard}>
                <Text style={styles.privateIcon}>🔒</Text>
                <Text style={styles.privateText}>El historial de este usuario es privado</Text>
              </View>
            ) : profile.location_history?.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>Sin actividad reciente</Text>
              </View>
            ) : (
              profile.location_history.map((loc, index) => (
                <View
                  key={index}
                  testID={`location-item-${index}`}
                  style={styles.locationItem}
                >
                  <View style={styles.locationTimeline}>
                    <View style={[styles.timelineDot, index === 0 && styles.timelineDotFirst]} />
                    {index < profile.location_history.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.locationContent}>
                    <Text style={styles.locationLabel}>
                      {loc.label ? `📍 ${loc.label}` : '📍 Ubicación registrada'}
                    </Text>
                    <Text style={styles.locationTime}>
                      {formatTimeAgo(loc.createdAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const AVATAR_SIZE = 88;
const DOT_SIZE = 18;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    alignItems: 'center',
  },
  backIcon: {
    color: colors.primary,
    fontSize: 34,
    lineHeight: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSizes.lg,
  },

  /* ── States ── */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontSize: fontSizes.md,
    marginBottom: spacing.lg,
  },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  retryText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSizes.md,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingBottom: spacing.xxl + spacing.xl,
  },

  /* ── Avatar section ── */
  avatarSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatarRing: {
    position: 'relative',
    width: AVATAR_SIZE + 8,
    height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: fontSizes.xxxl,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  dotOnline: {
    backgroundColor: '#22c55e',
  },
  dotOffline: {
    backgroundColor: '#6b7280',
  },
  profileName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSizes.xl,
    marginBottom: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statusDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  statusOnline: {
    color: '#22c55e',
  },
  statusOffline: {
    color: colors.textMuted,
  },

  /* ── Sections ── */
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  biographyText: {
    color: colors.text,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    fontStyle: 'italic',
  },

  /* ── Private card ── */
  privateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  privateIcon: {
    fontSize: 28,
  },
  privateText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Location timeline ── */
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  locationTimeline: {
    alignItems: 'center',
    width: 20,
    marginRight: spacing.sm,
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textMuted,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 1,
  },
  timelineDotFirst: {
    backgroundColor: colors.primary,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 2,
    minHeight: 30,
  },
  locationContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationLabel: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  locationTime: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
});
