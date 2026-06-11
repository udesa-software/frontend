import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../api/notifications';
import { spacing, fontSizes, radii, useTheme } from '../theme/index';

export function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMarking, setIsMarking] = useState(false);
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const fetchNotifications = async (targetPage, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (targetPage === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await notificationsApi.getNotifications(targetPage, 20);
      // We expect response.data to have the PaginatedNotifications schema structure
      const { notifications: fetchedList, pages } = response.data || response || {};

      if (isRefresh || targetPage === 1) {
        setNotifications(fetchedList || []);
      } else {
        setNotifications((prev) => [...prev, ...(fetchedList || [])]);
      }
      setTotalPages(pages || 1);
      setPage(targetPage);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      Alert.alert('Error', 'No se pudieron cargar las notificaciones.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchNotifications(1, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && page < totalPages) {
      fetchNotifications(page + 1);
    }
  };

  const handleMarkAllAsRead = async () => {
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) return;

    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await notificationsApi.markAllAsRead();
    } catch (err) {
      console.error('Error marking all as read:', err);
      // Rollback on error
      setNotifications(previousNotifications);
      Alert.alert('Error', 'No se pudieron marcar las notificaciones como leídas.');
    }
  };

  const handleDeleteNotification = async (id) => {
    // Optimistic update
    const previousNotifications = [...notifications];
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      await notificationsApi.deleteNotification(id);
    } catch (err) {
      console.error('Error deleting notification:', err);
      // Rollback on error
      setNotifications(previousNotifications);
      Alert.alert('Error', 'No se pudo eliminar la notificación.');
    }
  };

  const handleNotificationTap = async (item) => {
    // 1. Mark as read locally and in API if it's not read yet
    if (!item.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      try {
        await notificationsApi.markAsRead(item.id);
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    // 2. Navigation redirect logic based on payload data
    let data = item.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.warn('Failed to parse notification payload data:', e);
      }
    }

    if (data && data.screen === 'PendingRequests') {
      navigation.navigate('Main', {
        screen: 'Amigos',
        params: { activeTab: 'pending' },
      });
    } else if (data && data.screen === 'MapFocus') {
      navigation.navigate('Main', {
        screen: 'Mapa',
        params: { focusUserId: data.friendId },
      });
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return '';
    }
  };

  const renderNotificationItem = ({ item }) => {
    return (
      <View style={[styles.notificationCard, !item.is_read && styles.unreadCard]}>
        {!item.is_read && <View style={styles.unreadDot} />}
        
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.textContainer}
            onPress={() => handleNotificationTap(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.cardTitle, !item.is_read && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.cardBody}>{item.body}</Text>
            <Text style={styles.cardTime}>{formatTimeAgo(item.created_at)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID={`delete-button-${item.id}`}
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(item.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.bellBadgeContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Historial vacío</Text>
        <Text style={styles.emptySubtitle}>
          No tienes notificaciones por el momento. ¡Te avisaremos cuando haya novedades!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Notificaciones</Text>

        <TouchableOpacity
          testID="mark-all-read-button"
          style={styles.readAllButton}
          onPress={handleMarkAllAsRead}
          activeOpacity={0.7}
          disabled={!notifications.some((n) => !n.is_read)}
        >
          <Ionicons
            name="checkmark-done"
            size={24}
            color={notifications.some((n) => !n.is_read) ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotificationItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContainer,
            notifications.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: 'bold',
  },
  readAllButton: {
    padding: spacing.xs,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  notificationCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(108, 99, 255, 0.3)',
  },
  unreadDot: {
    position: 'absolute',
    top: spacing.md + 4,
    left: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: spacing.xs,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  unreadTitle: {
    color: colors.text,
    fontWeight: 'bold',
  },
  cardBody: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  cardTime: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    opacity: 0.7,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderFooter: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  bellBadgeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(170, 170, 170, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSizes.lg,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
