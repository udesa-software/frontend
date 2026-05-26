import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/notifications';
import { colors, spacing, fontSizes, radii } from '../theme';

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      
      const checkUnread = async () => {
        try {
          const response = await notificationsApi.getNotifications(1, 20);
          const list = response.data?.notifications || response?.notifications || [];
          if (isMounted) {
            setHasUnread(list.some((n) => !n.is_read));
          }
        } catch (err) {
          console.warn('Error checking unread notifications:', err);
        }
      };

      checkUnread();
      
      return () => {
        isMounted = false;
      };
    }, [])
  );
  
  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/logo-udesamigos.png')} 
            style={styles.logoTiny} 
            resizeMode="contain"
          />
          <Text style={styles.headerAppName}>UdeSA-migos</Text>
        </View>

        <TouchableOpacity 
          testID="bell-button"
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {hasUnread && <View testID="unread-badge" style={styles.badge} />}
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <Image 
          source={require('../../assets/logo-udesamigos.png')} 
          style={styles.logo} 
          resizeMode="contain"
        />
        <Text style={styles.title}>¡Hola, {user.username}!</Text>
        <Text style={styles.subtitle}>{user.email}</Text>
        
        <View style={styles.card}>
          <Text style={styles.cardInfo}>Bienvenido a UdeSA-migos.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTiny: {
    width: 30,
    height: 30,
    marginRight: spacing.xs,
  },
  headerAppName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  bellButton: {
    padding: spacing.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxxl,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSizes.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: {
    color: colors.text,
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
});


