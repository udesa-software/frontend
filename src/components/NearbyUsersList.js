import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { AppButton } from './AppButton';
import { colors, spacing, fontSizes, radii } from '../theme';
import { getRadar } from '../api/location';
import { friendsApi } from '../api/friends';

export function NearbyUsersList() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionsLoading, setActionsLoading] = useState({});
  const [relationshipStatuses, setRelationshipStatuses] = useState({});

  const fetchNearby = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación requerido',
          'Activá los permisos de ubicación para descubrir usuarios cercanos.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const response = await getRadar({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
      const fetchedUsers = response.users || [];
      if (fetchedUsers.length > 0) {
        try {
          const ids = fetchedUsers.map(u => u.userId);
          const statusesRes = await friendsApi.getRelationshipStatuses(ids);
          setRelationshipStatuses(statusesRes.data || {});
        } catch (e) {
          console.error("Error fetching statuses:", e);
        }
      } else {
        setRelationshipStatuses({});
      }
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error en radar de descubrimiento:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Error al buscar usuarios cercanos';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  const handleAction = async (user) => {
    const status = relationshipStatuses[user.userId] || 'none';
    if (status === 'self' || status === 'blocked') return;

    setActionsLoading((prev) => ({ ...prev, [user.userId]: true }));
    try {
      if (status === 'none') {
        await friendsApi.sendRequest(user.userId);
        setRelationshipStatuses(prev => ({ ...prev, [user.userId]: 'pending_sent' }));
      } else if (status === 'friends') {
        await friendsApi.removeFriend(user.userId);
        setRelationshipStatuses(prev => ({ ...prev, [user.userId]: 'none' }));
      } else if (status === 'pending_sent') {
        await friendsApi.cancelRequest(user.userId);
        setRelationshipStatuses(prev => ({ ...prev, [user.userId]: 'none' }));
      } else if (status === 'pending_received') {
        await friendsApi.acceptRequest(user.userId);
        setRelationshipStatuses(prev => ({ ...prev, [user.userId]: 'friends' }));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error en la acción';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading((prev) => ({ ...prev, [user.userId]: false }));
    }
  };

  const renderItem = ({ item }) => {
    const isActionLoading = actionsLoading[item.userId] || false;
    const status = relationshipStatuses[item.userId] || 'none';

    if (status === 'self' || status === 'blocked') {
      return (
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('UserProfile', { userId: item.userId, username: item.username })}
          activeOpacity={0.7}
        >
          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(item.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.username}</Text>
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>📍 {item.distance}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    let btnTitle = 'Agregar';
    let btnVariant = 'primary';

    if (status === 'friends') {
      btnTitle = 'Eliminar';
      btnVariant = 'danger';
    } else if (status === 'pending_sent') {
      btnTitle = 'Pendiente';
      btnVariant = 'secondary';
    } else if (status === 'pending_received') {
      btnTitle = 'Aceptar';
      btnVariant = 'success';
    }

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('UserProfile', { userId: item.userId, username: item.username })}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(item.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item.username}</Text>
            <View style={styles.distancePill}>
              <Text style={styles.distanceText}>📍 {item.distance}</Text>
            </View>
          </View>
        </View>
        <AppButton
          title={btnTitle}
          onPress={() => handleAction(item)}
          isLoading={isActionLoading}
          variant={btnVariant}
          style={styles.addButton}
          textStyle={{ fontSize: fontSizes.sm }}
        />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.loader}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.resultsLabel}>
        {users.length > 0
          ? `${users.length} usuario${users.length === 1 ? '' : 's'} encontrado${users.length === 1 ? '' : 's'}`
          : 'Sin usuarios cercanos'}
      </Text>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>Nadie cerca</Text>
          <Text style={styles.emptyText}>
            No hay usuarios públicos dentro de tu radio de búsqueda configurado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginVertical: spacing.xl,
  },
  container: {
    flex: 1,
  },
  resultsLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: fontSizes.md,
    marginBottom: 4,
  },
  distancePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.round,
  },
  distanceText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
});
