import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { AppButton } from './AppButton';
import { colors, spacing, fontSizes, radii } from '../theme';
import { friendsApi } from '../api/friends';

export function FriendsList({ onGoToSearch }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical' | 'proximity'
  const [removingId, setRemovingId] = useState(null);

  const fetchFriends = useCallback(async (pageNum, sortParam, isRefresh = false) => {
    if (loading || (!hasMore && !isRefresh)) return;

    setLoading(true);
    try {
      const response = await friendsApi.getFriendsList(sortParam, pageNum);
      const responseData = response.data;
      const newFriends = responseData.data || responseData || []; // Handle different pagination formats

      if (isRefresh) {
        setFriends(newFriends);
      } else {
        setFriends(prev => [...prev, ...newFriends]);
      }

      const pagination = responseData.pagination || {};
      setHasMore(pagination.page ? pagination.page < pagination.totalPages : false);
      setPage(pageNum);
    } catch (err) {
      console.error('Error al obtener la lista de amigos:', err);
      Alert.alert('Error', 'No se pudieron cargar tus amigos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    fetchFriends(1, sortBy, true);
  }, [sortBy]); // Refetch when sort changes

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchFriends(1, sortBy, true);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchFriends(page + 1, sortBy);
    }
  };
  const handleRemoveFriend = (friendId, username) => {
    Alert.alert(
      'Eliminar Amigo',
      `¿Estás seguro de que quieres eliminar a ${username} de tu lista de amigos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            setRemovingId(friendId);
            try {
              await friendsApi.removeFriend(friendId);
              // CA.5: Actualización en tiempo real de la lista local
              setFriends(prev => prev.filter(f => f.friend_id !== friendId));
            } catch (err) {
              console.error('Error al eliminar amigo:', err);
              Alert.alert('Error', 'No se pudo eliminar al amigo. Reintentá más tarde.');
            } finally {
              setRemovingId(null);
            }
          }
        }
      ]
    );
  };

  const renderSortToggle = () => (
    <View style={styles.sortContainer}>
      <TouchableOpacity 
        style={[styles.sortButton, sortBy === 'alphabetical' && styles.sortButtonActive]}
        onPress={() => { setHasMore(true); setSortBy('alphabetical'); }}
      >
        <Text style={[styles.sortText, sortBy === 'alphabetical' && styles.sortTextActive]}>Alfabético</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.sortButton, sortBy === 'proximity' && styles.sortButtonActive]}
        onPress={() => { setHasMore(true); setSortBy('proximity'); }}
      >
        <Text style={[styles.sortText, sortBy === 'proximity' && styles.sortTextActive]}>Por Cercanía</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.friend_username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.username}>{item.friend_username}</Text>
        </View>
        <AppButton 
          title="Eliminar"
          variant="danger"
          style={styles.removeButton}
          textStyle={styles.removeButtonText}
          isLoading={removingId === item.friend_id}
          onPress={() => handleRemoveFriend(item.friend_id, item.friend_username)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSortToggle()}
      <FlatList
        testID="friends-list"
        data={friends}
        keyExtractor={(item) => item.friend_id ? item.friend_id.toString() : Math.random().toString()}
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
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>¡Aún no tenés amigos!</Text>
              <Text style={styles.emptyText}>Conectate con otros usuarios para compartir tu ubicación.</Text>
              <AppButton 
                title="Buscar Amigos" 
                onPress={onGoToSearch}
                style={styles.emptyButton}
              />
            </View>
          )
        }
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sortContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
  },
  sortText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: fontSizes.sm,
  },
  sortTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1, // Ensures empty container is centered if needed
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
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
  removeButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginVertical: 0,
    minHeight: 32,
    borderRadius: radii.sm,
  },
  removeButtonText: {
    fontSize: fontSizes.sm,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontSize: fontSizes.md,
  },
  emptyButton: {
    width: '100%',
  },
  loader: {
    marginVertical: spacing.md,
  },
});
