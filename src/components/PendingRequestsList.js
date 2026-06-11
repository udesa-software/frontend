import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { AppButton } from './AppButton';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';
import { friendsApi } from '../api/friends';

export function PendingRequestsList() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [actionsLoading, setActionsLoading] = useState({});
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const loadingRef = useRef(false);

  const fetchRequests = useCallback(async (pageNum, isRefresh = false) => {
    if (loadingRef.current || (!hasMore && !isRefresh)) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await friendsApi.getPendingRequests(pageNum);
      const responseData = response.data;
      const newRequests = responseData.data || responseData || [];

      if (isRefresh) {
        setRequests(newRequests);
      } else {
        setRequests(prev => [...prev, ...newRequests]);
      }

      const pagination = responseData.pagination || {};
      setHasMore(pagination.page < pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error al obtener solicitudes pendientes:', err);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes pendientes.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasMore]);

  useEffect(() => {
    fetchRequests(1, true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchRequests(1, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loadingRef.current) {
      fetchRequests(page + 1);
    }
  };

  const handleAccept = async (requester_id) => {
    setActionsLoading(prev => ({ ...prev, [requester_id]: 'accept' }));
    try {
      await friendsApi.acceptRequest(requester_id);
      setRequests(prev => prev.filter(r => r.requester_id !== requester_id));
      Alert.alert('Éxito', 'Solicitud aceptada. Ahora son amigos.');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al aceptar solicitud';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [requester_id]: null }));
    }
  };

  const handleDecline = async (requester_id) => {
    setActionsLoading(prev => ({ ...prev, [requester_id]: 'decline' }));
    try {
      await friendsApi.declineRequest(requester_id);
      setRequests(prev => prev.filter(r => r.requester_id !== requester_id));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al rechazar solicitud';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [requester_id]: null }));
    }
  };

  const renderItem = ({ item }) => {
    const isAccepting = actionsLoading[item.requester_id] === 'accept';
    const isDeclining = actionsLoading[item.requester_id] === 'decline';
    const anyAction = isAccepting || isDeclining;

    return (
      <View style={styles.card}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.requester_username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.username}>{item.requester_username}</Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <AppButton
            title="Aceptar"
            onPress={() => handleAccept(item.requester_id)}
            isLoading={isAccepting}
            disabled={anyAction}
            style={[styles.button, styles.acceptButton]}
            textStyle={styles.buttonText}
          />
          <AppButton
            title="Rechazar"
            onPress={() => handleDecline(item.requester_id)}
            isLoading={isDeclining}
            disabled={anyAction}
            variant="secondary"
            style={[styles.button, styles.declineButton]}
            textStyle={styles.buttonText}
          />
        </View>
      </View>
    );
  };

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
        !loading && (
          <Text style={styles.emptyText}>No tenés solicitudes pendientes.</Text>
        )
      }
      ListFooterComponent={
        loading && !refreshing ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : null
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const getStyles = (colors) => StyleSheet.create({
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
  userInfo: {
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
  details: {
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
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 100,
    height: 36,
  },
  buttonText: {
    fontSize: fontSizes.sm,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    borderColor: colors.error,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSizes.md,
  },
  loader: {
    marginVertical: spacing.md,
  },
});
