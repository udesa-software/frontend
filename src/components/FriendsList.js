import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { AppButton } from './AppButton';
import { colors, spacing, fontSizes, radii } from '../theme';
import { friendsApi } from '../api/friends';
import { getFriendsLocations } from '../api/location';

export function FriendsList({ onGoToSearch }) {
  const navigation = useNavigation();
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
      let response;
      let newFriends = [];
      let totalPages = 0;

      if (sortParam === 'proximity') {
        // H7: Para ordenar por cercanía, consumimos el servicio de locations
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Error', 'Se requiere permiso de ubicación para ordenar por cercanía.');
          setSortBy('alphabetical');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        response = await getFriendsLocations({ 
          latitude: loc.coords.latitude, 
          longitude: loc.coords.longitude 
        });
        
        // Normalizamos el formato de location service (userId/username) al de friends service (friend_id/friend_username)
        const rawFriends = response.friends || [];
        newFriends = rawFriends.map(f => ({
          friend_id: f.userId,
          friend_username: f.username,
          distance: f.distance,
          distanceMeters: f.distanceMeters,
          latitude: f.latitude,
          longitude: f.longitude,
          label: f.label,
          updatedAt: f.updatedAt
        }));
        
        // El servicio de locations actualmente no pagina amigos, devuelve todos.
        totalPages = 1;
      } else {
        // Orden alfabético estándar desde el servicio de friends
        response = await friendsApi.getFriendsList(sortParam, pageNum);
        const responseData = response.data;
        newFriends = responseData.data || responseData || [];
        const pagination = responseData.pagination || {};
        totalPages = pagination.totalPages || 1;
      }

      if (isRefresh) {
        setFriends(newFriends);
      } else {
        setFriends(prev => [...prev, ...newFriends]);
      }

      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Error al obtener la lista de amigos:', err);
      Alert.alert('Error', 'No se pudieron cargar tus amigos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, hasMore]);

  const formatTimeAgo = (dateString) => {
    if (!dateString) return null;
    const now = new Date();
    const updated = new Date(dateString);
    const diffMs = now - updated;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    return `hace ${diffDays} d`;
  };

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
      {/* Sección izquierda: toca para ver el perfil del amigo */}
      <TouchableOpacity
        testID={`friend-card-${item.friend_id}`}
        style={styles.userInfo}
        onPress={() => navigation.navigate('FriendProfile', {
          friendId: item.friend_id,
          username: item.friend_username,
        })}
        activeOpacity={0.7}
      >
        {/* Avatar con indicador de presencia online (H10 CA.2) */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.friend_username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          {/* CA.2: punto verde si online, gris si offline */}
          <View
            testID={`online-dot-${item.friend_id}`}
            style={[styles.onlineDot, item.is_online ? styles.onlineDotOnline : styles.onlineDotOffline]}
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.username}>{item.friend_username}</Text>
          {item.distance && (
            <View style={styles.distanceContainer}>
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>📍 {item.distance}</Text>
              </View>
              {item.updatedAt && (
                <Text style={styles.timeAgoText}>• {formatTimeAgo(item.updatedAt)}</Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
      {/* Botón eliminar separado para no interferir con la navegación */}
      <AppButton
        title="Eliminar"
        variant="danger"
        style={styles.removeButton}
        textStyle={styles.removeButtonText}
        isLoading={removingId === item.friend_id}
        onPress={() => handleRemoveFriend(item.friend_id, item.friend_username)}
      />
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
  // H10 CA.2: wrapper relativo para posicionar el punto sobre el avatar
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  // H10 CA.2: indicador de presencia — punto en la esquina inferior derecha del avatar
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface, // borde del mismo color que la card para efecto "flotante"
  },
  onlineDotOnline: {
    backgroundColor: '#22c55e', // verde
  },
  onlineDotOffline: {
    backgroundColor: '#6b7280', // gris
  },
  details: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distancePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
    marginRight: spacing.xs,
  },
  distanceText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  timeAgoText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
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
