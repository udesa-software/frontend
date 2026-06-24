import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { PendingRequestsList } from '../components/PendingRequestsList';
import { FriendsList } from '../components/FriendsList';
import { NearbyUsersList } from '../components/NearbyUsersList';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';
import { usersApi } from '../api/users';
import { friendsApi } from '../api/friends';

export function FriendsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'search' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (route.params?.activeTab) {
      setActiveTab(route.params.activeTab);
    }
  }, [route.params?.activeTab]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionsLoading, setActionsLoading] = useState({});
  const [relationshipStatuses, setRelationshipStatuses] = useState({});
  // H6: toggle de descubrimiento
  const [showNearby, setShowNearby] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await usersApi.search(searchQuery.trim());
      const users = response.data.users || response.data || [];
      if (users.length > 0) {
        try {
          const ids = users.map(u => u.id);
          const statusesRes = await friendsApi.getRelationshipStatuses(ids);
          setRelationshipStatuses(statusesRes.data || {});
        } catch (e) {
          console.error("Error fetching statuses:", e);
        }
      } else {
        setRelationshipStatuses({});
      }
      setSearchResults(users);
    } catch (err) {
      console.error('Error al buscar usuarios:', err);
      const msg = err.response?.data?.error || err.message || 'Error al buscar usuarios';
      Alert.alert('Error', msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAction = async (user) => {
    const status = relationshipStatuses[user.id] || 'none';
    if (status === 'self' || status === 'blocked') return;

    setActionsLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      if (status === 'none') {
        await friendsApi.sendRequest(user.id);
        setRelationshipStatuses(prev => ({ ...prev, [user.id]: 'pending_sent' }));
      } else if (status === 'friends') {
        await friendsApi.removeFriend(user.id);
        setRelationshipStatuses(prev => ({ ...prev, [user.id]: 'none' }));
      } else if (status === 'pending_sent') {
        await friendsApi.cancelRequest(user.id);
        setRelationshipStatuses(prev => ({ ...prev, [user.id]: 'none' }));
      } else if (status === 'pending_received') {
        await friendsApi.acceptRequest(user.id);
        setRelationshipStatuses(prev => ({ ...prev, [user.id]: 'friends' }));
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error en la acción';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const renderUserItem = ({ item }) => {
    const isLoading = actionsLoading[item.id] || false;
    const status = relationshipStatuses[item.id] || 'none';

    if (status === 'self' || status === 'blocked') {
      return (
        <TouchableOpacity 
          style={styles.userCard}
          onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}
          activeOpacity={0.7}
        >
          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.username}>{item.username}</Text>
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
        style={styles.userCard}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id, username: item.username })}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
           <View style={styles.avatarPlaceholder}>
             <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
           </View>
           <View style={styles.userDetails}>
             <Text style={styles.username}>{item.username}</Text>
           </View>
        </View>
        <AppButton 
          title={btnTitle} 
          onPress={() => handleAction(item)}
          isLoading={isLoading}
          variant={btnVariant}
          style={styles.addButton}
          textStyle={{ fontSize: fontSizes.sm }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Amigos</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Mis Amigos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>Explorar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Solicitudes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' && (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.searchTabContent}
        >
          {/* Búsqueda por nombre */}
          <View style={styles.searchSection}>
            <AppInput
              placeholder="Buscar por usuario"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              wrapperStyle={styles.searchInput}
            />
            <AppButton
              title="Buscar"
              onPress={handleSearch}
              isLoading={isSearching}
              style={styles.searchButton}
            />
          </View>

          <Text style={styles.subtitle}>Resultados de búsqueda</Text>

          {isSearching ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderUserItem}
              scrollEnabled={false}
              ListEmptyComponent={
                searchQuery.trim() ? (
                  <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
                ) : (
                  <Text style={styles.emptyText}>Buscá un usuario para enviar una solicitud.</Text>
                )
              }
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* H6: Descubrir Amigos */}
          <View style={styles.discoverSection}>
            <View style={styles.divider} />
            {!showNearby ? (
              <AppButton
                testID="discover-friends-button"
                title="Buscar usuarios cercanos"
                onPress={() => setShowNearby(true)}
                style={styles.discoverButton}
              />
            ) : (
              <NearbyUsersList />
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'pending' && (
        <PendingRequestsList />
      )}

      {activeTab === 'friends' && (
        <FriendsList onGoToSearch={() => setActiveTab('search')} />
      )}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xxl,
  },
  title: {
    fontSize: fontSizes.xxl,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: fontSizes.md,
  },
  activeTabText: {
    color: colors.text,
  },
  searchTabContent: {
    paddingBottom: spacing.xxxl,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: 0,
  },
  searchButton: {
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  discoverSection: {
    marginTop: spacing.xl,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  discoverButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  userCard: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  biography: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 90,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSizes.md,
  },
});
