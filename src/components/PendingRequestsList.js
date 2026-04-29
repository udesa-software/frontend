import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { colors, spacing, fontSizes, radii } from '../theme';
import { friendsApi } from '../api/friends';

export function PendingRequestsList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionsLoading, setActionsLoading] = useState({});

  // Ref para evitar fetches concurrentes sin depender de estado en useCallback
  const isFetchingRef = useRef(false);

  const loadRequests = async ({ pageNum = 1, replace = false } = {}) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (replace) setError(null);

    try {
      const response = await friendsApi.getPendingRequests(pageNum);
      const data = response.data?.data ?? [];
      const pagination = response.data?.pagination ?? {};

      setRequests(prev => (replace ? data : [...prev, ...data]));
      setPage(pageNum);
      setHasMore(pageNum < (pagination.totalPages ?? 1));
    } catch (err) {
      console.error('Error al obtener solicitudes pendientes:', err);
      // Detenemos más cargas para evitar loop con FlatList vacío
      setHasMore(false);
      if (replace) setError('No se pudieron cargar las solicitudes. Deslizá para reintentar.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  // Carga inicial
  useEffect(() => {
    loadRequests({ pageNum: 1, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadRequests({ pageNum: 1, replace: true });
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetchingRef.current && requests.length > 0) {
      loadRequests({ pageNum: page + 1, replace: false });
    }
  };

  const handleAccept = async (requesterId) => {
    setActionsLoading(prev => ({ ...prev, [requesterId]: 'accept' }));
    try {
      await friendsApi.acceptRequest(requesterId);
      setRequests(prev => prev.filter(r => r.requester_id !== requesterId));
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al aceptar solicitud';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [requesterId]: null }));
    }
  };

  const handleDecline = async (requesterId) => {
    setActionsLoading(prev => ({ ...prev, [requesterId]: 'decline' }));
    try {
      await friendsApi.declineRequest(requesterId);
      setRequests(prev => prev.filter(r => r.requester_id !== requesterId));
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al rechazar solicitud';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [requesterId]: null }));
    }
  };

  const renderItem = ({ item }) => {
    const action = actionsLoading[item.requester_id];
    const isAccepting = action === 'accept';
    const isDeclining = action === 'decline';
    const busy = isAccepting || isDeclining;
    const initial = (item.requester_username || 'U').charAt(0).toUpperCase();

    return (
      <View style={styles.card}>
        {/* Avatar + nombre */}
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.requester_username}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Botones */}
        <View style={styles.actions}>
          <TouchableOpacity
            testID={`accept-btn-${item.requester_id}`}
            style={[styles.btn, styles.acceptBtn, busy && styles.btnDisabled]}
            onPress={() => handleAccept(item.requester_id)}
            disabled={busy}
            activeOpacity={0.8}
          >
            {isAccepting
              ? <ActivityIndicator size="small" color={colors.text} />
              : <Text style={styles.btnText}>✓ Aceptar</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            testID={`decline-btn-${item.requester_id}`}
            style={[styles.btn, styles.declineBtn, busy && styles.btnDisabled]}
            onPress={() => handleDecline(item.requester_id)}
            disabled={busy}
            activeOpacity={0.8}
          >
            {isDeclining
              ? <ActivityIndicator size="small" color={colors.error} />
              : <Text style={[styles.btnText, styles.declineBtnText]}>✕ Rechazar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      testID="pending-requests-list"
      data={requests}
      keyExtractor={(item) => item.requester_id.toString()}
      renderItem={renderItem}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        error
          ? <Text style={styles.errorText}>{error}</Text>
          : <Text style={styles.emptyText}>No tenés solicitudes pendientes.</Text>
      }
      ListFooterComponent={
        loading && requests.length > 0 ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.footerLoader} />
        ) : null
      }
      contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxl,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.lg,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  date: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.success,
  },
  declineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  declineBtnText: {
    color: colors.error,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSizes.md,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontSize: fontSizes.md,
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
});
