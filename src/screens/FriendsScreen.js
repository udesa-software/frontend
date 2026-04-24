import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { AppInput } from '../components/AppInput';
import { AppButton } from '../components/AppButton';
import { colors, spacing, fontSizes, radii } from '../theme';
import { usersApi } from '../api/users';
import { friendsApi } from '../api/friends';

export function FriendsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionsLoading, setActionsLoading] = useState({});
  // Guardamos localmente los IDs a los que ya enviamos solicitud en esta sesión
  const [sentRequestIds, setSentRequestIds] = useState(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await usersApi.search(searchQuery.trim());
      setSearchResults(response.data);
    } catch (err) {
      console.error('Error al buscar usuarios:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (user) => {
    setActionsLoading(prev => ({ ...prev, [user.id]: true }));
    try {
      await friendsApi.sendRequest(user.id);
      // Actualizamos el estado local inmediatamente
      setSentRequestIds(prev => new Set(prev).add(user.id));
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error al enviar solicitud';
      Alert.alert('Error', msg);
    } finally {
      setActionsLoading(prev => ({ ...prev, [user.id]: false }));
    }
  };

  const renderUserItem = ({ item }) => {
    const isLoading = actionsLoading[item.id] || false;
    const isSent = sentRequestIds.has(item.id);

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
           <View style={styles.avatarPlaceholder}>
             <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
           </View>
           <View style={styles.userDetails}>
             <Text style={styles.username}>{item.username}</Text>
             <Text style={styles.biography} numberOfLines={1}>
               {item.biography || 'Sin biografía'}
             </Text>
           </View>
        </View>
        <AppButton 
          title={isSent ? 'Pendiente' : 'Agregar'} 
          onPress={() => handleSendRequest(item)}
          isLoading={isLoading}
          variant={isSent ? 'secondary' : 'primary'}
          disabled={isSent}
          style={styles.addButton}
          textStyle={{ fontSize: fontSizes.sm }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Amigos</Text>
      
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.xxl,
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
