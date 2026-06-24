import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usersApi } from '../api/users';
import { friendsApi } from '../api/friends';
import { getFriendProfile } from '../api/location';
import { colors, spacing, fontSizes, radii } from '../theme';

// H9: motivos de denuncia — valor enviado al backend (debe matchear reports.schemas.js) + label visible
const REPORT_REASONS = [
  { value: 'inappropriate_content', label: 'Contenido inapropiado' },
  { value: 'harassment', label: 'Acoso o comportamiento abusivo' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake_profile', label: 'Perfil falso' },
  { value: 'other', label: 'Otro' },
];

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
 * Pantalla de perfil generalizada: funciona para cualquier usuario.
 * - Muestra biografía, presencia online.
 * - Muestra historial de ubicaciones SOLO si son amigos (y no está en modo privado).
 * - Botones de acción según el estado de la relación:
 *     'none'             → Agregar
 *     'friends'          → Eliminar
 *     'pending_sent'     → Pendiente (deshabilitado)
 *     'pending_received' → Aceptar / Rechazar
 *     'self'             → sin botones
 *
 * Parámetros de navegación:
 *   userId   {string}  UUID del usuario a mostrar
 *   username {string}  Nombre provisional (para el header mientras carga)
 */
export function UserProfileScreen() {
  const navigation = useNavigation();
  const { userId, username: initialUsername } = useRoute().params ?? {};

  const [profile, setProfile]               = useState(null);
  const [relationship, setRelationship]     = useState(null); // { status }
  const [locationData, setLocationData]     = useState(null); // { isHistoryPrivate, location_history }
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionLoading, setActionLoading]   = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingOther, setReportingOther] = useState(false);
  const [reasonDetail, setReasonDetail] = useState('');

  // ── Carga inicial ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!userId) return;
    setLoadingProfile(true);
    try {
      const [profileRes, relRes] = await Promise.all([
        usersApi.getUserPublicProfile(userId),
        friendsApi.getRelationshipStatus(userId),
      ]);
      const prof = profileRes.data;
      const rel  = relRes.data;
      setProfile(prof);
      setRelationship(rel);

      // Si son amigos, intentar traer historial de ubicaciones
      if (rel.status === 'friends') {
        try {
          const locData = await getFriendProfile(userId);
          setLocationData(locData);
        } catch {
          setLocationData({ isHistoryPrivate: false, location_history: [] });
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al cargar el perfil';
      Alert.alert('Error', msg);
      navigation.goBack();
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Acciones de amistad ───────────────────────────────────────────────────
  const handleAdd = async () => {
    setActionLoading(true);
    try {
      await friendsApi.sendRequest(userId);
      setRelationship({ status: 'pending_sent' });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo enviar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Eliminar Amigo',
      `¿Querés eliminar a ${profile?.username} de tus amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await friendsApi.removeFriend(userId);
              setRelationship({ status: 'none' });
              setLocationData(null);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await friendsApi.acceptRequest(userId);
      setRelationship({ status: 'friends' });
      // Cargar historial ahora que somos amigos
      try {
        const locData = await getFriendProfile(userId);
        setLocationData(locData);
      } catch {
        setLocationData({ isHistoryPrivate: false, location_history: [] });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo aceptar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await friendsApi.declineRequest(userId);
      setRelationship({ status: 'none' });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo rechazar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await friendsApi.cancelRequest(userId);
      setRelationship({ status: 'none' });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo cancelar la solicitud');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlock = () => {
    const name = profile?.username || initialUsername || 'este usuario';
    Alert.alert(
      'Bloquear usuario',
      `¿Estás seguro de que querés bloquear a ${name}? No podrá enviarte solicitudes ni ver tu actividad.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await friendsApi.blockUser(userId, name);
              Alert.alert('Bloqueado', `${name} ha sido bloqueado.`);
              setRelationship({ status: 'blocked' });
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'No se pudo bloquear al usuario');
            }
          },
        },
      ]
    );
  };

  const handleUnblock = async () => {
    try {
      await friendsApi.unblockUser(userId);
      Alert.alert('Desbloqueado', 'El usuario ha sido desbloqueado.');
      setRelationship({ status: 'none' });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo desbloquear al usuario');
    }
  };

  // H9: cierra el modal de denuncia y resetea el paso del texto libre, para que la
  // próxima vez que se abra vuelva a arrancar en la lista de motivos.
  const closeReportModal = () => {
    setReportModalVisible(false);
    setReportingOther(false);
    setReasonDetail('');
  };

  // H9: denunciar usuario — motivos de la lista fija (no aplica a "Otro", ver handleSubmitOtherReason)
  const handleReportReason = async (reason) => {
    const name = profile?.username || initialUsername || 'este usuario';
    closeReportModal();
    try {
      await friendsApi.reportUser(userId, name, reason);
      Alert.alert('Denuncia enviada', `Gracias por reportar a ${name}. Vamos a revisar el caso.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'No se pudo enviar la denuncia');
    }
  };

  // H9: denunciar usuario con motivo "Otro" — requiere descripción libre
  const handleSubmitOtherReason = async () => {
    const detail = reasonDetail.trim();
    if (!detail) return;
    const name = profile?.username || initialUsername || 'este usuario';
    closeReportModal();
    try {
      await friendsApi.reportUser(userId, name, 'other', detail);
      Alert.alert('Denuncia enviada', `Gracias por reportar a ${name}. Vamos a revisar el caso.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'No se pudo enviar la denuncia');
    }
  };

  // ── Render botones de acción ──────────────────────────────────────────────
  const renderActionButtons = () => {
    if (!relationship || relationship.status === 'self') return null;

    const { status } = relationship;

    if (status === 'none') {
      return (
        <TouchableOpacity
          testID="action-add"
          style={[styles.actionBtn, styles.btnPrimary]}
          onPress={handleAdd}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={colors.text} />
            : <Text style={styles.actionBtnText}>Agregar amigo</Text>
          }
        </TouchableOpacity>
      );
    }

    if (status === 'friends') {
      return (
        <TouchableOpacity
          testID="action-remove"
          style={[styles.actionBtn, styles.btnDanger]}
          onPress={handleRemove}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={colors.text} />
            : <Text style={styles.actionBtnText}>Eliminar amigo</Text>
          }
        </TouchableOpacity>
      );
    }

    if (status === 'pending_sent') {
      return (
        <TouchableOpacity
          testID="action-cancel"
          style={[styles.actionBtn, styles.btnMuted]}
          onPress={handleCancel}
          disabled={actionLoading}
        >
          {actionLoading
            ? <ActivityIndicator size="small" color={colors.text} />
            : <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Cancelar solicitud</Text>
          }
        </TouchableOpacity>
      );
    }

    if (status === 'pending_received') {
      return (
        <View style={styles.dualBtnRow}>
          <TouchableOpacity
            testID="action-accept"
            style={[styles.actionBtn, styles.btnSuccess, { flex: 1, marginRight: spacing.sm }]}
            onPress={handleAccept}
            disabled={actionLoading}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Text style={styles.actionBtnText}>Aceptar</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            testID="action-decline"
            style={[styles.actionBtn, styles.btnDanger, { flex: 1 }]}
            onPress={handleDecline}
            disabled={actionLoading}
          >
            <Text style={styles.actionBtnText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ── Pantalla ──────────────────────────────────────────────────────────────
  const displayName = profile?.username || initialUsername || '…';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
        <View style={styles.backBtn} />
      </View>

      {loadingProfile ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Avatar + presencia */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              {profile && (
                <View
                  testID="online-status-dot"
                  style={[styles.onlineDot, profile.is_online ? styles.dotOnline : styles.dotOffline]}
                />
              )}
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            {profile && (
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
            )}
          </View>

          {/* Botones de acción */}
          <View style={styles.actionSection}>
            {renderActionButtons()}
          </View>

          {/* Biografía */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biografía</Text>
            <View style={styles.card}>
              <Text style={[styles.biographyText, !profile?.biography && styles.emptyText]}>
                {profile?.biography || 'Sin biografía'}
              </Text>
            </View>
          </View>

          {/* Historial de ubicaciones — solo si son amigos */}
          {relationship?.status === 'friends' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Historial de lugares</Text>
              {!locationData ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
              ) : locationData.isHistoryPrivate ? (
                <View style={styles.privateCard}>
                  <Text style={styles.privateIcon}>🔒</Text>
                  <Text style={styles.privateText}>El historial de este usuario es privado</Text>
                </View>
              ) : locationData.location_history?.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>Sin actividad reciente</Text>
                </View>
              ) : (
                locationData.location_history.map((loc, index) => (
                  <View key={index} testID={`location-item-${index}`} style={styles.locationItem}>
                    <View style={styles.locationTimeline}>
                      <View style={[styles.timelineDot, index === 0 && styles.timelineDotFirst]} />
                      {index < locationData.location_history.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.locationContent}>
                      <Text style={styles.locationLabel}>
                        {loc.label ? `📍 ${loc.label}` : '📍 Ubicación registrada'}
                      </Text>
                      <Text style={styles.locationTime}>{formatTimeAgo(loc.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Mensaje si no son amigos */}
          {relationship?.status !== 'friends' && relationship?.status !== 'self' && (
            <View style={styles.section}>
              <View style={styles.lockedCard}>
                <Text style={styles.privateIcon}>🔒</Text>
                <Text style={styles.privateText}>Hacete amigo para ver el historial de lugares</Text>
              </View>
            </View>
          )}

          {/* Bloquear / Desbloquear usuario */}
          {relationship?.status !== 'self' && (
            <View style={styles.section}>
              {relationship?.status === 'blocked' ? (
                <TouchableOpacity style={styles.blockBtn} onPress={handleUnblock}>
                  <Text style={styles.blockBtnText}>Desbloquear usuario</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.blockBtn} onPress={handleBlock}>
                  <Text style={styles.blockBtnText}>Bloquear usuario</Text>
                </TouchableOpacity>
              )}

              {/* H9: denunciar usuario — disponible incluso si ya está bloqueado */}
              <TouchableOpacity
                testID="action-report"
                style={styles.reportBtn}
                onPress={() => setReportModalVisible(true)}
              >
                <Text style={styles.reportBtnText}>Denunciar usuario</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      )}

      {/* H9: selector de motivo de denuncia (o descripción libre si el motivo es "Otro") */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReportModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Denunciar usuario</Text>
            {!reportingOther ? (
              <>
                <Text style={styles.modalSubtitle}>Elegí el motivo de la denuncia</Text>
                {REPORT_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    testID={`report-reason-${r.value}`}
                    style={styles.reasonOption}
                    onPress={() => (r.value === 'other' ? setReportingOther(true) : handleReportReason(r.value))}
                  >
                    <Text style={styles.reasonOptionText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Contanos qué pasó</Text>
                <TextInput
                  testID="report-other-input"
                  style={styles.otherReasonInput}
                  placeholder="Describí el motivo de la denuncia..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={500}
                  value={reasonDetail}
                  onChangeText={setReasonDetail}
                  autoFocus
                />
                <TouchableOpacity
                  testID="report-other-submit"
                  style={[styles.reasonOption, !reasonDetail.trim() && styles.reasonOptionDisabled]}
                  disabled={!reasonDetail.trim()}
                  onPress={handleSubmitOtherReason}
                >
                  <Text style={styles.reasonOptionText}>Enviar denuncia</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              testID="report-cancel"
              style={styles.reasonCancel}
              onPress={closeReportModal}
            >
              <Text style={styles.reasonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 88;
const DOT_SIZE    = 18;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

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
  backBtn:    { width: 36, alignItems: 'center' },
  backIcon:   { color: colors.primary, fontSize: 34, lineHeight: 36 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSizes.lg,
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: spacing.xxl + spacing.xl },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg },
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
  avatarText:  { color: colors.text, fontWeight: '800', fontSize: fontSizes.xxxl },
  onlineDot: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: DOT_SIZE, height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  dotOnline:  { backgroundColor: '#22c55e' },
  dotOffline: { backgroundColor: '#6b7280' },
  profileName: { color: colors.text, fontWeight: '700', fontSize: fontSizes.xl, marginBottom: spacing.sm },
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
  statusDotSmall: { width: 8, height: 8, borderRadius: 4 },
  statusText:    { fontSize: fontSizes.sm, fontWeight: '500' },
  statusOnline:  { color: '#22c55e' },
  statusOffline: { color: colors.textMuted },

  // Botones
  actionSection: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
  dualBtnRow:   { flexDirection: 'row' },
  actionBtn: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger:  { backgroundColor: '#dc2626' },
  btnSuccess: { backgroundColor: '#16a34a' },
  btnMuted:   { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { color: colors.text, fontWeight: '700', fontSize: fontSizes.md },

  // Secciones
  section:      { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
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
  biographyText: { color: colors.text, fontSize: fontSizes.md, lineHeight: 22 },
  emptyText:     { color: colors.textMuted, fontSize: fontSizes.md, fontStyle: 'italic' },

  privateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  lockedCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  privateIcon: { fontSize: 28 },
  privateText: { color: colors.textMuted, fontSize: fontSizes.md, textAlign: 'center', lineHeight: 22 },

  // Timeline de ubicaciones
  locationItem:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  locationTimeline: { alignItems: 'center', width: 20, marginRight: spacing.sm, paddingTop: 4 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.textMuted,
    borderWidth: 2, borderColor: colors.surface,
    zIndex: 1,
  },
  timelineDotFirst: { backgroundColor: colors.primary },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 2, minHeight: 30 },
  locationContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationLabel: { color: colors.text, fontSize: fontSizes.sm, fontWeight: '500', marginBottom: 2 },
  locationTime:  { color: colors.textMuted, fontSize: fontSizes.xs },

  blockBtn: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  blockBtnText: {
    color: '#ef4444', // Red-500
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  reportBtn: {
    padding: spacing.md,
    alignItems: 'center',
  },
  reportBtnText: {
    color: '#f97316', // Orange-500 — consistente con el badge "En revisión" del backoffice
    fontSize: fontSizes.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  reasonOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reasonOptionDisabled: {
    opacity: 0.4,
  },
  reasonOptionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    textAlign: 'center',
  },
  otherReasonInput: {
    minHeight: 90,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSizes.md,
    padding: spacing.md,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  reasonCancel: {
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  reasonCancelText: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
});
