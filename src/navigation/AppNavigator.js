import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { PreferencesScreen } from '../screens/PreferencesScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { MapScreen } from '../screens/MapScreen';
import { View, ActivityIndicator, Text } from 'react-native';
import { colors, spacing } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'udesamigos://'],
  config: {
    screens: {
      ResetPassword: 'ResetPassword',
    },
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: spacing.sm,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>
        }}
      />
      <Tab.Screen 
        name="Amigos" 
        component={FriendsScreen} 
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text>
        }}
      />
      {/* Tu pestaña de mapa migrada */}
      <Tab.Screen
        name="Mapa"
        component={MapScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📍</Text>,
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>
        }}
      />
    </Tab.Navigator>
  );
}

function Navigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {user ? (
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="Preferences" 
              component={PreferencesScreen} 
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
            />
          </Stack.Group>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export function AppNavigator() {
  return (
    <AuthProvider>
      <Navigator />
    </AuthProvider>
  );
}
